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


@pytest.mark.django_db
def test_cosmetics_catalog_marks_locks_by_xp():
    user = make_user('c1@x.com', 'Cos1', 200)
    client = APIClient()
    client.force_authenticate(user)
    body = client.get('/api/auth/cosmetics/').json()

    items = {(i['slot'], i['id']): i for i in body['catalog']}
    assert items[('hat', 'salakot')]['unlocked'] is True      # tier 2, 151 XP
    assert items[('hat', 'safari')]['unlocked'] is False      # tier 3, 401 XP
    assert body['equipped'] == {'hat': '', 'frame': '', 'pin': '', 'backdrop': ''}


@pytest.mark.django_db
def test_cosmetics_equip_unlocked_and_reject_locked_or_unknown():
    user = make_user('c2@x.com', 'Cos2', 200)
    client = APIClient()
    client.force_authenticate(user)

    ok = client.patch('/api/auth/cosmetics/', {'hat': 'salakot', 'frame': 'teal'}, format='json')
    assert ok.status_code == 200
    assert ok.json()['equipped']['hat'] == 'salakot'

    locked = client.patch('/api/auth/cosmetics/', {'hat': 'crown'}, format='json')
    assert locked.status_code == 403

    unknown = client.patch('/api/auth/cosmetics/', {'pin': 'laser'}, format='json')
    assert unknown.status_code == 400

    user.refresh_from_db()
    assert (user.avatar_hat, user.avatar_frame, user.avatar_pin) == ('salakot', 'teal', '')


@pytest.mark.django_db
def test_profile_cannot_set_cosmetics_directly_and_leaderboard_shows_them():
    user = make_user('c3@x.com', 'Cos3', 0)
    client = APIClient()
    client.force_authenticate(user)
    client.patch('/api/auth/profile/', {'avatar_hat': 'crown'}, format='json')
    user.refresh_from_db()
    assert user.avatar_hat == ''

    client.patch('/api/auth/cosmetics/', {'hat': 'cap'}, format='json')
    me = client.get('/api/auth/leaderboard/').json()['me']
    assert me['hat'] == 'cap'
