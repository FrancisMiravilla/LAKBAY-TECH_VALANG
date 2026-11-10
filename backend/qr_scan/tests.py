from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import CustomUser
from promotions.models import CoinBundle, Transaction
from .models import CulturalSpot, QRMarker, QRScan, UserActivityLog


class ReportsViewTests(TestCase):
    url = '/api/qr/reports/'

    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email='admin@lakbay.test', password='x', role='admin', is_staff=True,
        )
        self.local = CustomUser.objects.create_user(
            email='local@lakbay.test', password='x', in_game_name='Juan', xp=250, visitor_type='local',
        )
        self.tourist = CustomUser.objects.create_user(
            email='tourist@lakbay.test', password='x', in_game_name='Ana', xp=90, visitor_type='tourist',
        )
        spot = CulturalSpot.objects.create(
            name='Fort Pilar', description='d', location_name='Zamboanga', latitude=6.9, longitude=122.0,
        )
        marker = QRMarker.objects.create(spot=spot, qr_code_string='LAKBAY-FORT-PILAR')
        QRScan.objects.create(user=self.local, qr_marker=marker)
        QRScan.objects.create(user=self.tourist, qr_marker=marker)
        UserActivityLog.objects.create(user=self.local, activity_type='catch', title='caught Vinta')
        UserActivityLog.objects.create(user=self.tourist, activity_type='ar', title='found an artwork')
        bundle = CoinBundle.objects.create(name='Starter', coins_amount=100, price_php=49)
        Transaction.objects.create(user=self.tourist, bundle=bundle, amount_php=49, coins_to_add=100, status='PAID')
        Transaction.objects.create(user=self.tourist, bundle=bundle, amount_php=49, coins_to_add=100, status='FAILED')

    def test_requires_admin(self):
        self.client.force_authenticate(self.tourist)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_summary_and_breakdowns(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        s = data['summary']
        self.assertEqual(s['total_tourists'], 2)
        self.assertEqual(s['new_users'], 2)
        self.assertEqual(s['active_users'], 2)
        self.assertEqual(s['qr_checkins'], 2)
        self.assertEqual(s['catches'], 1)
        self.assertEqual(s['ar_detections'], 1)
        self.assertEqual(s['revenue_php'], 49.0)
        self.assertEqual(s['coins_sold'], 100)
        self.assertEqual(s['paid_transactions'], 1)

        self.assertEqual(data['range']['days'], 30)
        self.assertEqual(len(data['daily']), 30)
        self.assertEqual(sum(d['checkins'] for d in data['daily']), 2)
        self.assertEqual(sum(d['revenue'] for d in data['daily']), 49.0)
        self.assertEqual(data['top_spots'], [{'name': 'Fort Pilar', 'checkins': 2}])
        self.assertEqual({v['type']: v['count'] for v in data['visitor_types']}, {'local': 1, 'tourist': 1})
        self.assertEqual([p['in_game_name'] for p in data['top_players']], ['Juan', 'Ana'])

    def test_range_excludes_older_records(self):
        QRScan.objects.update(scanned_at=timezone.now() - timedelta(days=60))
        self.client.force_authenticate(self.admin)
        data = self.client.get(self.url).json()
        self.assertEqual(data['summary']['qr_checkins'], 0)
        self.assertEqual(data['top_spots'], [])

    def test_custom_range_is_clamped_and_ordered(self):
        self.client.force_authenticate(self.admin)
        data = self.client.get(self.url, {'start': '2026-03-10', 'end': '2026-03-01'}).json()
        self.assertEqual(
            data['range'],
            {'start': '2026-03-01', 'end': '2026-03-10', 'days': 10, 'timezone': 'Asia/Manila'},
        )
        data = self.client.get(self.url, {'start': '2020-01-01', 'end': '2026-03-01'}).json()
        self.assertEqual(data['range']['days'], 366)


class MyCollectionTests(TestCase):
    def setUp(self):
        from .models import ARTarget, CulturalIcon
        self.user = CustomUser.objects.create_user(email='col@x.com', password='pass12345', in_game_name='Col')
        other = CustomUser.objects.create_user(email='other@x.com', password='pass12345', in_game_name='Oth')
        self.target = ARTarget.objects.create(name='Sea Spirit', building='S3', rarity='rare', slot_number=2)
        self.icon = CulturalIcon.objects.create(name='Curacha', emoji='x', tagline='Crab', type_name='t', about='a', significance='s')
        self.spot = CulturalSpot.objects.create(name='Paseo Vinta', description='d', historical_background='h',
                                                cultural_significance='c', fun_fact='f', location_name='Paseo del Mar',
                                                latitude=6.9, longitude=122.07)
        for t, title in [('ar', 'discovered "Sea Spirit" in AR Exhibit'),
                         ('ar', 'discovered "Sea Spirit" in AR Exhibit'),
                         ('ar', 'discovered "Deleted Art" in AR Exhibit'),
                         ('catch', 'caught "Curacha" in AR'),
                         ('catch', 'caught "paseo vinta" in AR'),
                         ('scan', 'scanned "Fort Pilar"')]:
            UserActivityLog.objects.create(user=self.user, activity_type=t, title=title)
        UserActivityLog.objects.create(user=other, activity_type='catch', title='caught "Curacha" in AR')

    def test_rebuilds_collection_from_activity_log(self):
        client = APIClient()
        client.force_authenticate(self.user)
        body = client.get('/api/qr/my-collection/').json()
        self.assertEqual([a['id'] for a in body['ar']], [self.target.id])
        self.assertEqual(body['ar'][0]['rarity'], 'rare')
        self.assertEqual(sorted(str(c['id']) for c in body['catch']), sorted([str(self.icon.id), f'spot-icon-{self.spot.id}']))

    def test_requires_login(self):
        self.assertEqual(APIClient().get('/api/qr/my-collection/').status_code, 401)
