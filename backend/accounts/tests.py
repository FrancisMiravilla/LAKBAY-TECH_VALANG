import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def make_user(email, ign, xp, **extra):
    return User.objects.create_user(email=email, password='pass12345', in_game_name=ign, xp=xp, **extra)


@pytest.mark.django_db
def test_leaderboard_orders_by_xp_and_shares_tied_ranks():
    me = make_user('me@x.com', 'Me', 150, chosen_character='bela')
    make_user('a@x.com', 'Top', 900)
    make_user('b@x.com', 'TieOne', 300)
    make_user('c@x.com', 'TieTwo', 300)
    make_user('admin@x.com', 'Admin', 5000, role='admin', is_staff=True)
    make_user('guide@x.com', 'Guide', 4000, role='tourist_guide')
    make_user('off@x.com', 'Banned', 3000, is_active=False)
    User.objects.create_user(email='new@x.com', password='pass12345', xp=2000)  # no IGN yet

    client = APIClient()
    client.force_authenticate(me)
    res = client.get('/api/auth/leaderboard/')

    assert res.status_code == 200
    body = res.json()
    assert [r['in_game_name'] for r in body['results']] == ['Top', 'TieOne', 'TieTwo', 'Me']
    assert [r['rank'] for r in body['results']] == [1, 2, 2, 4]
    assert body['total_players'] == 4
    assert body['me']['rank'] == 4 and body['me']['is_me'] is True
    assert body['me']['chosen_character'] == 'bela'
    assert body['me']['level'] == 2
    assert 'email' not in body['results'][0]


@pytest.mark.django_db
def test_leaderboard_requires_login():
    assert APIClient().get('/api/auth/leaderboard/').status_code == 401
