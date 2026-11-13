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
from django.utils import timezone
from django.utils.html import escape

from .models import EmailVerificationCode

logger = logging.getLogger(__name__)

CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 5


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


def send_code(user, purpose='signup'):
    """Create a fresh code for `user` and email it. Returns True if it was sent."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    now = timezone.now()
    EmailVerificationCode.objects.update_or_create(
        user=user,
        defaults={'code_hash': _hash(code), 'expires_at': now + CODE_TTL, 'sent_at': now, 'attempts': 0},
    )
    try:
        _send_email(user.email, user.first_name, code, purpose)
        return True
    except Exception:
        logger.exception("Could not send the verification email to %s", user.email)
        return False


def check_code(user, code):
    """Return None when `code` is right (and mark the user verified), else an error message."""
    entry = EmailVerificationCode.objects.filter(user=user).first()
    if not entry:
        return "No code was sent to this email. Tap Resend to get one."
    if entry.expires_at < timezone.now():
        return "This code has expired. Tap Resend to get a new one."
    if entry.attempts >= MAX_ATTEMPTS:
        return "Too many wrong tries. Tap Resend to get a new code."
    if not hmac.compare_digest(entry.code_hash, _hash(str(code).strip())):
        entry.attempts += 1
        entry.save(update_fields=['attempts'])
        left = MAX_ATTEMPTS - entry.attempts
        return f"That code isn't right. {left} {'try' if left == 1 else 'tries'} left." if left else \
            "Too many wrong tries. Tap Resend to get a new code."
    user.email_verified = True
    user.save(update_fields=['email_verified'])
    entry.delete()
    return None


def needs_verification(user):
    """Only players signing up with email need the code; staff and Google accounts don't."""
    return (
        not user.email_verified
        and not user.is_staff
        and user.role == 'tourist'
        and user.auth_provider == 'email'
    )
