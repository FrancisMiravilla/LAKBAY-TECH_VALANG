"""Emailed 6-digit codes: sign-up verification and password reset.

Mail goes through Brevo's HTTP API when BREVO_API_KEY is set (Render's free
plan blocks outgoing SMTP), otherwise through Django's EMAIL_BACKEND, which
defaults to printing the email in the server console for local testing.
"""

import hashlib
import hmac
import logging
import math
import secrets
from datetime import timedelta

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.html import escape

from .models import EmailVerificationCode

logger = logging.getLogger(__name__)

CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 5
# Codes one account may be mailed per day. Guessing is capped at
# MAX_ATTEMPTS x MAX_CODES_PER_WINDOW = 50 tries a day out of 1,000,000 codes,
# and every new code is an email the real owner sees. There is deliberately no
# separate lockout for wrong guesses: anyone who knows an email could trigger
# it to block the real owner.
LIMIT_WINDOW = timedelta(hours=24)
MAX_CODES_PER_WINDOW = 10


def _hash(code):
    return hmac.new(settings.SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


EMAIL_COPY = {
    'signup': {
        'subject': "{code} is your LAKBAY verification code",
        'intro': "Your LAKBAY verification code is:",
        'action': "Copy this code and paste it in the LAKBAY app to finish signing up.",
        'ignore': "If you didn't sign up for LAKBAY, you can ignore this email.",
    },
    'reset': {
        'subject': "{code} is your LAKBAY password reset code",
        'intro': "Your LAKBAY password reset code is:",
        'action': "Copy this code and paste it in the LAKBAY app to choose a new password.",
        'ignore': "If you didn't ask to reset your password, you can ignore this email. "
                  "Your password stays the same.",
    },
}


def _send_email(to_email, name, code, purpose='signup'):
    copy = EMAIL_COPY[purpose]
    subject = copy['subject'].format(code=code)
    text = (
        f"Hi {name or 'Explorer'},\n\n"
        f"{copy['intro']} {code}\n\n"
        f"{copy['action']} It expires in 10 minutes.\n\n"
        f"{copy['ignore']}"
    )
    html = (
        f"<p>Hi {escape(name or 'Explorer')},</p>"
        f"<p>{copy['intro']}</p>"
        f"<p style=\"font-size:28px;font-weight:bold;letter-spacing:6px\">{code}</p>"
        f"<p>{copy['action']} It expires in 10 minutes.</p>"
        f"<p style=\"color:#888\">{copy['ignore']}</p>"
    )

    if settings.BREVO_API_KEY:
        response = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers={'api-key': settings.BREVO_API_KEY, 'accept': 'application/json'},
            json={
                'sender': {'name': 'LAKBAY', 'email': settings.EMAIL_FROM},
                'to': [{'email': to_email}],
                'subject': subject,
                'textContent': text,
                'htmlContent': html,
            },
            timeout=15,
        )
        response.raise_for_status()
        return

    send_mail(subject, text, settings.EMAIL_FROM or None, [to_email], html_message=html)


def seconds_until_resend(user):
    entry = EmailVerificationCode.objects.filter(user=user).first()
    if not entry:
        return 0
    wait = (entry.sent_at + RESEND_COOLDOWN - timezone.now()).total_seconds()
    return max(0, math.ceil(wait))


def _window_open(entry, now):
    return entry.window_start is not None and entry.window_start + LIMIT_WINDOW > now


def code_limit_reached(user):
    """True when this account was already mailed the most codes allowed today."""
    entry = EmailVerificationCode.objects.filter(user=user).first()
    return bool(entry and _window_open(entry, timezone.now()) and entry.codes_in_window >= MAX_CODES_PER_WINDOW)


def send_code(user, purpose='signup'):
    """Create a fresh code for `user` and email it. Returns True if it was sent."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    now = timezone.now()
    with transaction.atomic():
        entry = EmailVerificationCode.objects.select_for_update().filter(user=user).first()
        if entry is None:
            entry = EmailVerificationCode(user=user)
        if not _window_open(entry, now):
            entry.window_start, entry.codes_in_window = now, 0
        if entry.codes_in_window >= MAX_CODES_PER_WINDOW:
            return False
        entry.code_hash = _hash(code)
        entry.expires_at = now + CODE_TTL
        entry.sent_at = now
        entry.attempts = 0
        entry.codes_in_window += 1
        entry.save()
    try:
        _send_email(user.email, user.first_name, code, purpose)
        return True
    except Exception:
        logger.exception("Could not send the verification email to %s", user.email)
        return False


def check_code(user, code, consume=True):
    """Return None when `code` is right, else an error message.

    With consume=True a right code marks the email verified and is used up.
    With consume=False the code is only checked (wrong guesses still count),
    so the caller can finish other checks and then call use_code(user).
    """
    now = timezone.now()
    with transaction.atomic():
        entry = EmailVerificationCode.objects.select_for_update().filter(user=user).first()
        if not entry:
            return "No code was sent to this email. Tap Resend to get one."
        if entry.expires_at < now:
            return "This code has expired. Tap Resend to get a new one."
        if entry.attempts >= MAX_ATTEMPTS:
            return "Too many wrong tries. Tap Resend to get a new code."
        if not hmac.compare_digest(entry.code_hash, _hash(str(code).strip())):
            entry.attempts += 1
            entry.save(update_fields=['attempts'])
            left = MAX_ATTEMPTS - entry.attempts
            return f"That code isn't right. {left} {'try' if left == 1 else 'tries'} left." if left else \
                "Too many wrong tries. Tap Resend to get a new code."
    if consume:
        use_code(user)
    return None


def use_code(user):
    """Marks the email verified (the code proved the user owns it) and spends the code.

    The row is kept, with the code made unusable, so the daily code limit still applies.
    """
    if not user.email_verified:
        user.email_verified = True
        user.save(update_fields=['email_verified'])
    EmailVerificationCode.objects.filter(user=user).update(code_hash='', expires_at=timezone.now())


def needs_verification(user):
    """Only players signing up with email need the code; staff and Google accounts don't."""
    return (
        not user.email_verified
        and not user.is_staff
        and user.role == 'tourist'
        and user.auth_provider == 'email'
    )
