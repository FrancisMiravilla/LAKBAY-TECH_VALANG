import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_create_user():
    User = get_user_model()
    user = User.objects.create_user(email='testuser@example.com', password='password123')
    assert user.email == 'testuser@example.com'
    assert user.check_password('password123')
    assert user.is_active is True
    assert User.objects.count() == 1
