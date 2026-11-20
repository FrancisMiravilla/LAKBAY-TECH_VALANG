import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from qr_scan.models import CulturalSpot, TriviaAttempt, TriviaQuestion

User = get_user_model()


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def spot(db):
    s = CulturalSpot.objects.create(
        name='Fort Pilar', description='d', historical_background='h', cultural_significance='c',
        latitude=6.9, longitude=122.0, feature_types=['qr'],
    )
    TriviaQuestion.objects.create(spot=s, question='When?', choices=['a', 'b', 'c', 'd'], correct_index=0,
                                  status='approved')
    return s


@pytest.fixture
def player(db):
    return User.objects.create_user(email='p@x.com', password='pass12345', in_game_name='P')


def test_quiz_can_be_taken_once(spot, player):
    c = _client(player)
    trivia = f'/api/qr/spots/{spot.id}/trivia/'
    complete = f'{trivia}complete/'

    assert c.get(complete).data == {'taken': False, 'attempt': None}
    assert len(c.get(trivia).data['questions']) == 1

    res = c.post(complete, {'score': 4, 'total': 5}, format='json')
    assert res.status_code == 201 and res.data['attempt']['passed'] is True

    again = c.get(trivia).data
    assert again['already_taken'] is True and again['questions'] == []
    assert again['attempt']['score'] == 4
    assert c.get(complete).data['taken'] is True

    assert c.post(complete, {'score': 5, 'total': 5}, format='json').status_code == 409
    assert TriviaAttempt.objects.filter(user=player, spot=spot).count() == 1


def test_each_player_has_their_own_quiz(spot, player):
    other = User.objects.create_user(email='o@x.com', password='pass12345')
    _client(player).post(f'/api/qr/spots/{spot.id}/trivia/complete/', {'score': 1, 'total': 5}, format='json')

    assert len(_client(other).get(f'/api/qr/spots/{spot.id}/trivia/').data['questions']) == 1


@pytest.mark.parametrize('body', [{}, {'score': 'x', 'total': 5}, {'score': 6, 'total': 5}, {'score': 1, 'total': 0}])
def test_bad_completion_is_rejected(spot, player, body):
    res = _client(player).post(f'/api/qr/spots/{spot.id}/trivia/complete/', body, format='json')
    assert res.status_code == 400
    assert not TriviaAttempt.objects.exists()
