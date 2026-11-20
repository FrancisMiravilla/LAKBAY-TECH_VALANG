import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from promotions.models import UserPromotion
from qr_scan.models import CulturalSpot, QRMarker, QRScan

User = get_user_model()


def _user(email, ign, **extra):
    return User.objects.create_user(email=email, password='pass12345', in_game_name=ign, **extra)


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def _spot(name, features):
    return CulturalSpot.objects.create(
        name=name, description='d', historical_background='h', cultural_significance='c',
        latitude=6.9, longitude=122.0, feature_types=features,
    )


@pytest.mark.django_db
def test_qr_spot_needs_a_scan_before_rating():
    user = _user('a@x.com', 'Ana')
    spot = _spot('Fort Pilar', ['qr'])
    url = f'/api/qr/spots/{spot.id}/reviews/'

    assert _client(user).post(url, {'rating': 5}, format='json').status_code == 403

    marker = QRMarker.objects.create(spot=spot, qr_code_string='FP')
    QRScan.objects.create(user=user, qr_marker=marker)
    res = _client(user).post(url, {'rating': 4, 'comment': ' Lovely walls '}, format='json')

    assert res.status_code == 200
    assert res.data['average'] == 4.0
    assert res.data['count'] == 1
    assert res.data['my_review'] == {'rating': 4, 'comment': 'Lovely walls'}
    assert res.data['results'][0]['name'] == 'Ana'
    assert 'email' not in res.data['results'][0]


@pytest.mark.django_db
def test_rating_again_replaces_the_old_review_and_list_shows_the_average():
    a, b = _user('a@x.com', 'Ana'), _user('b@x.com', 'Ben')
    spot = _spot('Yakan Village', ['catch'])
    url = f'/api/qr/spots/{spot.id}/reviews/'

    _client(a).post(url, {'rating': 2}, format='json')
    _client(a).post(url, {'rating': 5}, format='json')
    _client(b).post(url, {'rating': 4}, format='json')

    _client(b).post(url, {'rating': 4, 'comment': 'Beautiful weaves'}, format='json')

    listed = next(s for s in _client(a).get('/api/qr/spots/').data if s['id'] == spot.id)
    assert listed['rating_count'] == 2
    assert listed['rating_avg'] == 4.5
    assert listed['latest_comment']['comment'] == 'Beautiful weaves'
    assert listed['latest_comment']['name'] == 'Ben'


@pytest.mark.django_db
@pytest.mark.parametrize('body', [
    {}, {'rating': 0}, {'rating': 6}, {'rating': 'x'}, {'rating': 3, 'comment': 'a' * 501},
])
def test_invalid_reviews_are_rejected(body):
    user = _user('a@x.com', 'Ana')
    spot = _spot('Yakan Village', ['catch'])
    assert _client(user).post(f'/api/qr/spots/{spot.id}/reviews/', body, format='json').status_code == 400


@pytest.mark.django_db
def test_promotion_reviews_owner_blocked_and_only_published():
    owner, visitor = _user('o@x.com', 'Owner'), _user('v@x.com', 'Visitor')
    promo = UserPromotion.objects.create(user=owner, spot_name='Chowtime', description='Seafood', status='PUBLISHED')
    draft = UserPromotion.objects.create(user=owner, spot_name='Draft', description='x', status='PENDING_REVIEW')

    url = f'/api/promotions/published/{promo.id}/reviews/'
    assert _client(owner).post(url, {'rating': 5}, format='json').status_code == 403
    draft_url = f'/api/promotions/published/{draft.id}/reviews/'
    assert _client(visitor).post(draft_url, {'rating': 5}, format='json').status_code == 404

    res = _client(visitor).post(url, {'rating': 3, 'comment': 'Good crabs'}, format='json')
    assert res.status_code == 200 and res.data['count'] == 1

    published = _client(visitor).get('/api/promotions/published/').data
    rows = published if isinstance(published, list) else published['results']
    row = next(p for p in rows if p['id'] == promo.id)
    assert row['rating_avg'] == 3.0 and row['rating_count'] == 1 and row['is_mine'] is False


@pytest.mark.django_db
def test_reviews_need_login():
    spot = _spot('Fort Pilar', ['qr'])
    assert APIClient().get(f'/api/qr/spots/{spot.id}/reviews/').status_code == 401
