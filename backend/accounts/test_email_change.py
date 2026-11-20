import pytest
from rest_framework.test import APIClient

from accounts.models import CustomUser

URL = '/api/auth/email/change/'


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def admin(db):
    return CustomUser.objects.create_user(email='admin@lakbay.ph', password='Secret#123', is_staff=True, role='admin')


def test_admin_changes_email_with_current_password(admin):
    res = _client(admin).post(URL, {'current_password': 'Secret#123', 'new_email': ' New@Lakbay.ph '}, format='json')
    assert res.status_code == 200
    admin.refresh_from_db()
    assert admin.email == 'new@lakbay.ph'


@pytest.mark.parametrize('body', [
    {'current_password': 'wrong', 'new_email': 'new@lakbay.ph'},
    {'current_password': 'Secret#123', 'new_email': 'not-an-email'},
    {'current_password': 'Secret#123', 'new_email': 'ADMIN@lakbay.ph'},
    {'current_password': 'Secret#123', 'new_email': 'taken@lakbay.ph'},
])
def test_bad_email_changes_are_rejected(admin, body):
    CustomUser.objects.create_user(email='taken@lakbay.ph', password='x1234567')
    assert _client(admin).post(URL, body, format='json').status_code == 400
    admin.refresh_from_db()
    assert admin.email == 'admin@lakbay.ph'


def test_tourists_cannot_use_it(db):
    tourist = CustomUser.objects.create_user(email='t@x.com', password='Secret#123')
    res = _client(tourist).post(URL, {'current_password': 'Secret#123', 'new_email': 'z@x.com'}, format='json')
    assert res.status_code == 403


def test_profile_cannot_change_its_own_role(db):
    tourist = CustomUser.objects.create_user(email='t@x.com', password='Secret#123')
    res = _client(tourist).patch('/api/auth/profile/', {'role': 'admin', 'full_name': 'Tess'}, format='json')
    assert res.status_code == 200
    tourist.refresh_from_db()
    assert tourist.role == 'tourist' and tourist.full_name == 'Tess'
