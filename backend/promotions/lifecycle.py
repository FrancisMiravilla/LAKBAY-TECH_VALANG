"""Monthly promotion listings: publish/renew, expiry and reminders.

A paid promotion is PUBLISHED until `expires_at`. Owners are reminded during the
last REMINDER days (in the app) and admins can send a manual reminder. Without a
renewal it becomes EXPIRED: hidden from the app and listed in the web archive.
There is no scheduler on the free host, so `expire_overdue()` runs before every
promotion listing instead.
"""
from datetime import timedelta
from html import escape

from django.db import transaction
from django.utils import timezone

from .models import AppSetting, UserPromotion, Wallet

DEFAULTS = {
    'PROMOTION_PUBLISH_COST': (50, 'Gold coins required to publish or renew a promotion'),
    'PROMOTION_DURATION_DAYS': (30, 'Days a paid promotion stays live before it must be renewed'),
    'PROMOTION_REMINDER_DAYS': (5, 'Days before expiry when owners start getting renewal reminders'),
}


class NotEnoughCoins(Exception):
    def __init__(self, cost, balance):
        super().__init__(f'Not enough coins. Required: {cost}, Balance: {balance}')
        self.cost = cost
        self.balance = balance


def setting(key):
    default, description = DEFAULTS[key]
    obj, _ = AppSetting.objects.get_or_create(key=key, defaults={'value': default, 'description': description})
    return obj.value


def expire_overdue(now=None):
    """Mark every published promotion whose paid period ended as EXPIRED."""
    now = now or timezone.now()
    return UserPromotion.objects.filter(status='PUBLISHED', expires_at__lte=now).update(status='EXPIRED')


def days_left(promotion, now=None):
    if not promotion.expires_at:
        return None
    now = now or timezone.now()
    seconds = (promotion.expires_at - now).total_seconds()
    return max(0, -(-int(seconds) // 86400))  # whole days, rounded up


def publish(promotion, now=None):
    """Start (or extend) the paid period. A live promotion is extended from its
    current end date, so renewing early never loses days."""
    now = now or timezone.now()
    still_live = promotion.status == 'PUBLISHED' and promotion.expires_at and promotion.expires_at > now
    start = promotion.expires_at if still_live else now
    if not still_live:
        promotion.published_at = now
    promotion.status = 'PUBLISHED'
    promotion.expires_at = start + timedelta(days=setting('PROMOTION_DURATION_DAYS'))
    promotion.reminder_sent_at = None
    promotion.save()
    return promotion


def charge_and_publish(promotion, user):
    """Deduct the publish cost from `user`'s wallet (row-locked) and publish/renew."""
    cost = setting('PROMOTION_PUBLISH_COST')
    with transaction.atomic():
        wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)
        if wallet.balance < cost:
            raise NotEnoughCoins(cost, wallet.balance)
        wallet.balance -= cost
        wallet.save(update_fields=['balance', 'updated_at'])
        return publish(promotion)


def send_reminder_email(promotion):
    """Best effort: the in-app reminder still works if mail is not configured."""
    from accounts.verification import send_email

    user = promotion.user
    name = user.in_game_name or user.full_name or 'Explorer'
    if promotion.status == 'EXPIRED':
        when = f"ended on {timezone.localtime(promotion.expires_at):%B %d, %Y}" if promotion.expires_at else 'has ended'
        lead = f'Your LAKBAY promotion "{promotion.spot_name}" {when} and is no longer shown to explorers.'
        subject = f'Your LAKBAY promotion "{promotion.spot_name}" has expired'
    else:
        when = f"{timezone.localtime(promotion.expires_at):%B %d, %Y}" if promotion.expires_at else 'soon'
        lead = f'Your LAKBAY promotion "{promotion.spot_name}" expires on {when}.'
        subject = f'Your LAKBAY promotion "{promotion.spot_name}" is expiring'
    action = 'Open LAKBAY, go to Promote > My Promotions and tap Renew to keep it live for another month.'
    text = f"Hi {name},\n\n{lead}\n\n{action}\n\nThank you for promoting Zamboanga City!"
    html = (
        f"<p>Hi {escape(name)},</p><p>{escape(lead)}</p>"
        f"<p>{escape(action)}</p><p style=\"color:#888\">Thank you for promoting Zamboanga City!</p>"
    )
    try:
        send_email(user.email, subject, text, html)
        return True
    except Exception as exc:  # noqa: BLE001 - mail outages must not block the reminder
        print('Promotion reminder email failed:', exc)
        return False
