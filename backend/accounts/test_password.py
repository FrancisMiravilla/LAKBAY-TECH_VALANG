import re

import pytest
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import CustomUser

OLD = 'Lakbay!Explorer2026'
NEW = 'Vinta#Sailing2027'


@pytest.fixture(autouse=True)
def local_mail(settings):
    settings.BREVO_API_KEY = ''
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    cache.clear()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email='juan@example.com', password=OLD, first_name='Juan', last_name='Cruz', email_verified=True,
    )


def login(client, password):
    return client.post('/api/auth/login/', {'email': 'juan@example.com', 'password': password}, format='json')


def mailed_code():
    return re.search(r'\b(\d{6})\b', mail.outbox[-1].subject).group(1)


def test_forgot_then_reset_sets_a_new_password(user):
    client = APIClient()
    assert client.post('/api/auth/password/forgot/', {'email': 'JUAN@example.com'}, format='json').status_code == 200
    assert len(mail.outbox) == 1 and 'password reset' in mail.outbox[0].subject

    reset = client.post('/api/auth/password/reset/', {
        'email': 'juan@example.com', 'code': mailed_code(), 'new_password': NEW,
    }, format='json')
    assert reset.status_code == 200
    assert login(client, OLD).status_code == 401
    assert login(client, NEW).status_code == 200


def test_forgot_gives_the_same_reply_for_unknown_emails(user):
    client = APIClient()
    known = client.post('/api/auth/password/forgot/', {'email': 'juan@example.com'}, format='json')
    unknown = client.post('/api/auth/password/forgot/', {'email': 'nobody@example.com'}, format='json')
    assert known.status_code == unknown.status_code == 200
    assert known.data == unknown.data
    assert len(mail.outbox) == 1


def test_forgot_does_not_mail_twice_within_the_cooldown(user):
    client = APIClient()
    client.post('/api/auth/password/forgot/', {'email': 'juan@example.com'}, format='json')
    client.post('/api/auth/password/forgot/', {'email': 'juan@example.com'}, format='json')
    assert len(mail.outbox) == 1


def test_reset_rejects_a_wrong_code_and_keeps_the_password(user):
    client = APIClient()
    client.post('/api/auth/password/forgot/', {'email': 'juan@example.com'}, format='json')
    wrong = '000000' if mailed_code() != '000000' else '111111'
    reset = client.post('/api/auth/password/reset/', {
        'email': 'juan@example.com', 'code': wrong, 'new_password': NEW,
    }, format='json')
    assert reset.status_code == 400
    assert login(client, OLD).status_code == 200


def test_reset_with_a_weak_password_does_not_use_up_the_code(user):
    client = APIClient()
    client.post('/api/auth/password/forgot/', {'email': 'juan@example.com'}, format='json')
    code = mailed_code()
    weak = client.post('/api/auth/password/reset/', {
        'email': 'juan@example.com', 'code': code, 'new_password': '12345',
    }, format='json')
    assert weak.status_code == 400 and weak.data['field'] == 'new_password'
    good = client.post('/api/auth/password/reset/', {
        'email': 'juan@example.com', 'code': code, 'new_password': NEW,
    }, format='json')
    assert good.status_code == 200


def test_reset_signs_out_existing_sessions(user):
    client = APIClient()
    refresh = login(client, OLD).data['refresh']
    client.post('/api/auth/password/forgot/', {'email': 'juan@example.com'}, format='json')
    client.post('/api/auth/password/reset/', {
        'email': 'juan@example.com', 'code': mailed_code(), 'new_password': NEW,
    }, format='json')
    assert client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json').status_code == 401


def test_change_password_needs_login_and_the_current_password(user):
    client = APIClient()
    body = {'current_password': OLD, 'new_password': NEW}
    assert client.post('/api/auth/password/change/', body, format='json').status_code == 401

    client.force_authenticate(user)
    wrong = client.post('/api/auth/password/change/', {'current_password': 'nope', 'new_password': NEW}, format='json')
    assert wrong.status_code == 400 and wrong.data['field'] == 'current_password'
    same = client.post('/api/auth/password/change/', {'current_password': OLD, 'new_password': OLD}, format='json')
    assert same.status_code == 400 and same.data['field'] == 'new_password'

    assert client.post('/api/auth/password/change/', body, format='json').status_code == 200
    client.force_authenticate(None)
    assert login(client, OLD).status_code == 401
    assert login(client, NEW).status_code == 200


def test_reset_gives_one_reply_for_unknown_and_known_emails(user):
    client = APIClient()
    body = {'code': '123456', 'new_password': NEW}
    unknown = client.post('/api/auth/password/reset/', {'email': 'nobody@example.com', **body}, format='json')
    no_code = client.post('/api/auth/password/reset/', {'email': 'juan@example.com', **body}, format='json')
    assert unknown.status_code == no_code.status_code == 400
    assert unknown.data == no_code.data

    weak = {'code': '123456', 'new_password': '12345'}
    weak_unknown = client.post('/api/auth/password/reset/', {'email': 'nobody@example.com', **weak}, format='json')
    weak_known = client.post('/api/auth/password/reset/', {'email': 'juan@example.com', **weak}, format='json')
    assert weak_unknown.data == weak_known.data


def test_change_password_signs_out_other_sessions_and_keeps_this_one(user):
    other_phone = APIClient()
    old_refresh = login(other_phone, OLD).data['refresh']

    this_phone = APIClient()
    this_phone.force_authenticate(user)
    body = {'current_password': OLD, 'new_password': NEW}
    res = this_phone.post('/api/auth/password/change/', body, format='json')
    assert res.status_code == 200 and res.data['refresh']

    assert other_phone.post('/api/auth/token/refresh/', {'refresh': old_refresh}, format='json').status_code == 401
    renewed = this_phone.post('/api/auth/token/refresh/', {'refresh': res.data['refresh']}, format='json')
    assert renewed.status_code == 200


def test_hourly_code_limit_is_kept_in_the_database(user):
    from accounts.models import EmailVerificationCode
    from accounts.verification import MAX_CODES_PER_WINDOW, send_code
    for _ in range(MAX_CODES_PER_WINDOW):
        assert send_code(user, purpose='reset')
    cache.clear()  # a restart or another worker must not reset the limit
    assert not send_code(user, purpose='reset')
    assert EmailVerificationCode.objects.get(user=user).codes_in_window == MAX_CODES_PER_WINDOW


def test_wrong_guesses_by_others_cannot_lock_out_a_new_code(user):
    from accounts.verification import MAX_ATTEMPTS, send_code, check_code
    send_code(user, purpose='reset')
    wrong = '000000' if mailed_code() != '000000' else '111111'
    for _ in range(MAX_ATTEMPTS):
        check_code(user, wrong)
    send_code(user, purpose='reset')
    assert check_code(user, mailed_code()) is None


def test_throttle_ignores_a_forged_forwarded_for_header(user):
    # The client writes a different fake IP each time; Render's proxy then
    # appends the address it really saw, which is what the throttle must use.
    from accounts.views import PasswordCodeThrottle
    client = APIClient()
    statuses = [
        client.post('/api/auth/password/forgot/', {'email': 'nobody@example.com'}, format='json',
                    HTTP_X_FORWARDED_FOR=f'10.0.0.{i}, 203.0.113.7').status_code
        for i in range(int(PasswordCodeThrottle.rate.split('/')[0]) + 1)
    ]
    assert statuses[-1] == 429
