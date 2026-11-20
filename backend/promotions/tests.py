import hashlib
import hmac
import json
import time

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from promotions.models import Transaction, Wallet
from promotions.views import verify_paymongo_signature

SECRET = 'whsk_test_secret'
URL = '/api/promotions/webhook/paymongo/'


def _payload(tx, livemode=False):
    return json.dumps({'data': {'attributes': {
        'type': 'checkout_session.payment.paid',
        'livemode': livemode,
        'data': {'attributes': {'reference_number': str(tx.id)}},
    }}}).encode()


def _header(body, secret=SECRET, livemode=False, timestamp=None):
    t = str(int(time.time()) if timestamp is None else timestamp)
    sig = hmac.new(secret.encode(), f'{t}.'.encode() + body, hashlib.sha256).hexdigest()
    return f't={t},te={"" if livemode else sig},li={sig if livemode else ""}'


@pytest.fixture
def pending_tx(db):
    user = get_user_model().objects.create_user(email='buyer@x.com', password='pass12345')
    return Transaction.objects.create(user=user, amount_php=100, coins_to_add=500)


def _post(body, header=None):
    extra = {'HTTP_PAYMONGO_SIGNATURE': header} if header is not None else {}
    return APIClient().post(URL, data=body, content_type='application/json', **extra)


def _balance(tx):
    return Wallet.objects.filter(user=tx.user).values_list('balance', flat=True).first() or 0


def test_signed_webhook_credits_coins_once(settings, pending_tx):
    settings.PAYMONGO_WEBHOOK_SECRET = SECRET
    body = _payload(pending_tx)

    assert _post(body, _header(body)).status_code == 200
    assert _post(body, _header(body)).status_code == 200

    pending_tx.refresh_from_db()
    assert pending_tx.status == 'PAID'
    assert _balance(pending_tx) == 500


def test_live_mode_webhook_uses_the_live_signature(settings, pending_tx):
    settings.PAYMONGO_WEBHOOK_SECRET = SECRET
    body = _payload(pending_tx, livemode=True)

    assert _post(body, _header(body, livemode=True)).status_code == 200
    assert _balance(pending_tx) == 500


@pytest.mark.parametrize('case', ['missing', 'wrong_secret', 'tampered_body', 'expired', 'garbage'])
def test_unverified_webhook_is_rejected_and_credits_nothing(settings, pending_tx, case):
    settings.PAYMONGO_WEBHOOK_SECRET = SECRET
    body = _payload(pending_tx)
    header = {
        'missing': None,
        'wrong_secret': _header(body, secret='not-the-secret'),
        'tampered_body': _header(body.replace(b'paid"', b'paid" ')),
        'expired': _header(body, timestamp=int(time.time()) - 3600),
        'garbage': 'nonsense',
    }[case]

    assert _post(body, header).status_code == 401
    pending_tx.refresh_from_db()
    assert pending_tx.status == 'PENDING'
    assert _balance(pending_tx) == 0


def test_webhook_is_refused_when_no_secret_is_configured(settings, pending_tx):
    settings.PAYMONGO_WEBHOOK_SECRET = ''
    body = _payload(pending_tx)

    assert _post(body, _header(body)).status_code == 401
    assert _balance(pending_tx) == 0


def test_test_mode_signature_is_not_accepted_for_a_live_event():
    body = json.dumps({'data': {'attributes': {'livemode': True}}}).encode()
    assert not verify_paymongo_signature(body, _header(body, livemode=False), SECRET)
