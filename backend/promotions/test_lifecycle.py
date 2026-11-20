from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from promotions.models import UserPromotion, Wallet

User = get_user_model()
BASE = '/api/promotions/'


@pytest.fixture(autouse=True)
def local_mail(settings):
    settings.BREVO_API_KEY = ''
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def owner(db):
    user = User.objects.create_user(email='owner@x.com', password='pass12345', in_game_name='Owner')
    Wallet.objects.create(user=user, balance=200)
    return user


@pytest.fixture
def admin(db):
    return User.objects.create_user(email='admin@x.com', password='pass12345', is_staff=True, role='admin')


def _promo(owner, **extra):
    return UserPromotion.objects.create(user=owner, spot_name='Chowtime', description='Seafood', **extra)


def _published_ids(client):
    data = client.get(f'{BASE}published/').data
    rows = data if isinstance(data, list) else data['results']
    return {p['id'] for p in rows}


def _balance(user):
    return Wallet.objects.get(user=user).balance


def test_publishing_starts_a_30_day_listing(owner):
    promo = _promo(owner, status='APPROVED_PENDING_PAYMENT')
    before = timezone.now()

    assert _client(owner).post(f'{BASE}promotions/{promo.id}/publish/').status_code == 200

    promo.refresh_from_db()
    assert promo.status == 'PUBLISHED'
    assert before + timedelta(days=30) <= promo.expires_at <= timezone.now() + timedelta(days=30)
    assert _balance(owner) == 150
    assert promo.id in _published_ids(_client(owner))


def test_unpaid_promotion_disappears_after_its_end_date_and_is_archived(owner, admin):
    promo = _promo(owner, status='PUBLISHED', expires_at=timezone.now() - timedelta(minutes=1))

    assert promo.id not in _published_ids(APIClient())
    promo.refresh_from_db()
    assert promo.status == 'EXPIRED'

    admin_rows = _client(admin).get(f'{BASE}promotions/').data
    admin_rows = admin_rows if isinstance(admin_rows, list) else admin_rows['results']
    row = next(r for r in admin_rows if r['id'] == promo.id)
    assert row['status'] == 'EXPIRED' and row['renewal_due'] is True


def test_reminder_window_flags(owner):
    soon = _promo(owner, status='PUBLISHED', expires_at=timezone.now() + timedelta(days=3, hours=1))
    later = _promo(owner, status='PUBLISHED', expires_at=timezone.now() + timedelta(days=10))

    rows = _client(owner).get(f'{BASE}promotions/').data
    rows = {r['id']: r for r in (rows if isinstance(rows, list) else rows['results'])}
    assert rows[soon.id]['days_left'] == 4 and rows[soon.id]['renewal_due'] is True
    assert rows[later.id]['days_left'] == 10 and rows[later.id]['renewal_due'] is False


def test_renewing_early_extends_from_the_current_end_date(owner):
    end = timezone.now() + timedelta(days=4)
    promo = _promo(owner, status='PUBLISHED', expires_at=end)

    res = _client(owner).post(f'{BASE}promotions/{promo.id}/renew/')

    assert res.status_code == 200
    promo.refresh_from_db()
    assert promo.expires_at == end + timedelta(days=30)
    assert _balance(owner) == 150


def test_renewing_an_expired_promotion_puts_it_back_live(owner):
    promo = _promo(owner, status='EXPIRED', expires_at=timezone.now() - timedelta(days=2))

    assert _client(owner).post(f'{BASE}promotions/{promo.id}/renew/').status_code == 200

    promo.refresh_from_db()
    assert promo.status == 'PUBLISHED'
    assert promo.expires_at > timezone.now() + timedelta(days=29)
    assert promo.id in _published_ids(APIClient())


def test_renew_needs_enough_coins_and_ownership(owner, admin):
    Wallet.objects.filter(user=owner).update(balance=10)
    promo = _promo(owner, status='EXPIRED', expires_at=timezone.now() - timedelta(days=1))

    assert _client(owner).post(f'{BASE}promotions/{promo.id}/renew/').status_code == 402
    assert _client(admin).post(f'{BASE}promotions/{promo.id}/renew/').status_code == 404
    promo.refresh_from_db()
    assert promo.status == 'EXPIRED' and _balance(owner) == 10


def test_admin_reminder_records_the_time_and_emails_the_owner(owner, admin):
    promo = _promo(owner, status='PUBLISHED', expires_at=timezone.now() + timedelta(days=5))

    assert _client(owner).post(f'{BASE}promotions/{promo.id}/remind/').status_code == 403
    res = _client(admin).post(f'{BASE}promotions/{promo.id}/remind/')

    assert res.status_code == 200 and res.data['emailed'] is True
    promo.refresh_from_db()
    assert promo.reminder_sent_at is not None
    assert len(mail.outbox) == 1 and 'Chowtime' in mail.outbox[0].subject


def test_owner_cannot_change_their_own_end_date(owner):
    end = timezone.now() + timedelta(days=2)
    promo = _promo(owner, status='PUBLISHED', expires_at=end)

    _client(owner).patch(f'{BASE}promotions/{promo.id}/', {'expires_at': '2099-01-01T00:00:00Z'}, format='json')

    promo.refresh_from_db()
    assert promo.expires_at == end


def test_owner_can_delete_their_promotion_but_not_someone_elses(owner):
    other = User.objects.create_user(email='other@x.com', password='pass12345')
    promo = _promo(owner, status='PUBLISHED', expires_at=timezone.now() + timedelta(days=10))

    assert _client(other).delete(f'{BASE}promotions/{promo.id}/').status_code == 404
    assert UserPromotion.objects.filter(pk=promo.id).exists()

    assert _client(owner).delete(f'{BASE}promotions/{promo.id}/').status_code == 204
    assert not UserPromotion.objects.filter(pk=promo.id).exists()
    assert promo.id not in _published_ids(APIClient())
