import re
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import CustomUser, EmailVerificationCode

PASSWORD = 'Lakbay!Explorer2026'


@pytest.fixture(autouse=True)
def local_mail(settings):
    settings.BREVO_API_KEY = ''
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


def sign_up(client, email='juan@example.com', **extra):
    return client.post('/api/auth/register/', {
        'email': email, 'password': PASSWORD, 're_password': PASSWORD,
        'first_name': 'Juan', 'last_name': 'Cruz', 'location': 'Zamboanga City', **extra,
    }, format='json')


def mailed_code():
    return re.search(r'\b(\d{6})\b', mail.outbox[-1].subject).group(1)


@pytest.mark.django_db
def test_sign_up_mails_a_code_and_blocks_login_until_verified():
    client = APIClient()
    assert sign_up(client).status_code == 201
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ['juan@example.com']
    assert mailed_code() in mail.outbox[0].body

    login = client.post('/api/auth/login/', {'email': 'juan@example.com', 'password': PASSWORD}, format='json')
    assert login.status_code == 403
    assert login.data['code'] == 'email_not_verified'

    verify = client.post('/api/auth/verify-email/', {'email': 'juan@example.com', 'code': mailed_code()}, format='json')
    assert verify.status_code == 200 and verify.data['access']
    assert CustomUser.objects.get(email='juan@example.com').email_verified

    login = client.post('/api/auth/login/', {'email': 'juan@example.com', 'password': PASSWORD}, format='json')
    assert login.status_code == 200 and login.data['access']


@pytest.mark.django_db
def test_wrong_codes_are_limited():
    client = APIClient()
    sign_up(client)
    good = mailed_code()
    bad = '000000' if good != '000000' else '111111'
    for _ in range(5):
        r = client.post('/api/auth/verify-email/', {'email': 'juan@example.com', 'code': bad}, format='json')
        assert r.status_code == 400
    r = client.post('/api/auth/verify-email/', {'email': 'juan@example.com', 'code': good}, format='json')
    assert r.status_code == 400 and 'Too many' in r.data['detail']


@pytest.mark.django_db
def test_expired_code_is_rejected():
    client = APIClient()
    sign_up(client)
    EmailVerificationCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    r = client.post('/api/auth/verify-email/', {'email': 'juan@example.com', 'code': mailed_code()}, format='json')
    assert r.status_code == 400 and 'expired' in r.data['detail']


@pytest.mark.django_db
def test_resend_has_a_cooldown_and_replaces_the_code():
    client = APIClient()
    sign_up(client)
    assert client.post('/api/auth/resend-code/', {'email': 'juan@example.com'}, format='json').status_code == 429
    EmailVerificationCode.objects.update(sent_at=timezone.now() - timedelta(minutes=2))
    assert client.post('/api/auth/resend-code/', {'email': 'juan@example.com'}, format='json').status_code == 200
    assert len(mail.outbox) == 2
    r = client.post('/api/auth/verify-email/', {'email': 'juan@example.com', 'code': mailed_code()}, format='json')
    assert r.status_code == 200


@pytest.mark.django_db
def test_verified_account_cannot_get_tokens_from_verify_endpoint():
    user = CustomUser.objects.create_user(email='old@example.com', password=PASSWORD, full_name='Old User')
    user.email_verified = True
    user.save()
    r = APIClient().post('/api/auth/verify-email/', {'email': 'old@example.com', 'code': '123456'}, format='json')
    assert r.status_code == 400 and 'access' not in r.data


@pytest.mark.django_db
def test_sign_up_cannot_make_itself_staff():
    sign_up(APIClient(), is_staff=True, is_superuser=True)
    user = CustomUser.objects.get(email='juan@example.com')
    assert not user.is_staff and not user.is_superuser


@pytest.mark.django_db
def test_staff_log_in_without_a_code():
    CustomUser.objects.create_user(email='admin@example.com', password=PASSWORD, full_name='Admin', is_staff=True)
    r = APIClient().post('/api/auth/login/', {'email': 'admin@example.com', 'password': PASSWORD}, format='json')
    assert r.status_code == 200
