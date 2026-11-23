import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from qr_scan.models import CulturalSpot, QRMarker

User = get_user_model()
VIDEO = 'https://res.cloudinary.com/demo/video/upload/v1/lakbay/videos/fort.mp4'


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def admin(db):
    return User.objects.create_user(email='a@x.com', password='pass12345', role='admin', is_staff=True)


@pytest.fixture
def player(db):
    return User.objects.create_user(email='p@x.com', password='pass12345', in_game_name='P')


def _spot(**extra):
    return CulturalSpot.objects.create(
        name='Fort Pilar', description='d', historical_background='h', cultural_significance='c',
        location_name='Zamboanga', latitude=6.9, longitude=122.0, feature_types=['qr'], **extra,
    )


def test_admin_saves_and_clears_video(admin):
    spot = _spot()
    c = _client(admin)
    res = c.patch(f'/api/qr/spots/{spot.id}/', {'video_url': VIDEO}, format='json')
    assert res.status_code == 200 and res.data['video_url'] == VIDEO
    res = c.patch(f'/api/qr/spots/{spot.id}/', {'video_url': ''}, format='json')
    assert res.status_code == 200 and res.data['video_url'] == ''


def test_video_link_must_be_web_address(admin):
    spot = _spot()
    res = _client(admin).patch(f'/api/qr/spots/{spot.id}/', {'video_url': 'ftp://x/v.mp4'}, format='json')
    assert res.status_code == 400


@pytest.mark.parametrize('video, expected', [(VIDEO, VIDEO), ('', None)])
def test_scan_returns_video(player, video, expected):
    spot = _spot(video_url=video)
    QRMarker.objects.create(spot=spot, qr_code_string='FORT-1')
    res = _client(player).post('/api/qr/validate/', {'qr_code': 'FORT-1'}, format='json')
    assert res.status_code == 200 and res.data['spot']['video_url'] == expected


def test_upload_signature_is_staff_only(player, admin, monkeypatch):
    import cloudinary
    cfg = cloudinary.config()
    for key, value in {'cloud_name': 'demo', 'api_key': '123', 'api_secret': 'secret'}.items():
        monkeypatch.setattr(cfg, key, value, raising=False)
    url = '/api/qr/video-upload-signature/'
    assert _client(player).post(url).status_code == 403
    res = _client(admin).post(url)
    assert res.status_code == 200
    assert res.data['folder'] == 'lakbay/videos' and res.data['signature']
    assert 'secret' not in str(res.data)
