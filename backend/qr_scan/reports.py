from datetime import date, datetime, time, timedelta
from accounts.levels import level_for_xp
from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CustomUser
from promotions.models import Transaction, UserPromotion
from .models import QRScan, TriviaQuestion, UserActivityLog

REPORT_TZ = ZoneInfo('Asia/Manila')
DEFAULT_DAYS = 30
MAX_DAYS = 366

ACTIVITY_LABELS = dict(UserActivityLog.ACTIVITY_TYPES)
VISITOR_LABELS = {'local': 'Local (Zamboanga City)', 'tourist': 'Tourist'}


def _parse_day(value):
    try:
        return date.fromisoformat(value) if value else None
    except ValueError:
        return None


def _daily_counts(queryset, field):
    rows = (
        queryset
        .annotate(day=TruncDate(field, tzinfo=REPORT_TZ))
        .values('day')
        .annotate(n=Count('id'))
    )
    return {r['day']: r['n'] for r in rows}


class ReportsView(APIView):
    """
    Admin analytics for a date range (days in Asia/Manila).
    GET /api/qr/reports/?start=YYYY-MM-DD&end=YYYY-MM-DD  (default: last 30 days)
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = datetime.now(REPORT_TZ).date()
        end = _parse_day(request.query_params.get('end')) or today
        start = _parse_day(request.query_params.get('start')) or end - timedelta(days=DEFAULT_DAYS - 1)
        if start > end:
            start, end = end, start
        if (end - start).days + 1 > MAX_DAYS:
            start = end - timedelta(days=MAX_DAYS - 1)

        lo = datetime.combine(start, time.min, tzinfo=REPORT_TZ)
        hi = datetime.combine(end + timedelta(days=1), time.min, tzinfo=REPORT_TZ)

        tourists = CustomUser.objects.filter(role='tourist', is_staff=False)
        new_users = tourists.filter(date_joined__gte=lo, date_joined__lt=hi)
        scans = QRScan.objects.filter(scanned_at__gte=lo, scanned_at__lt=hi)
        logs = UserActivityLog.objects.filter(created_at__gte=lo, created_at__lt=hi)
        paid = Transaction.objects.filter(status='PAID', created_at__gte=lo, created_at__lt=hi)

        # ── Daily series ─────────────────────────────────────────────────────
        checkins_by_day = _daily_counts(scans, 'scanned_at')
        users_by_day = _daily_counts(new_users, 'date_joined')
        catches_by_day = _daily_counts(logs.filter(activity_type='catch'), 'created_at')
        ar_by_day = _daily_counts(logs.filter(activity_type='ar'), 'created_at')
        revenue_by_day = {
            r['day']: float(r['total'] or 0)
            for r in paid.annotate(day=TruncDate('created_at', tzinfo=REPORT_TZ))
            .values('day').annotate(total=Sum('amount_php'))
        }
        daily = []
        day = start
        while day <= end:
            daily.append({
                'date': day.isoformat(),
                'checkins': checkins_by_day.get(day, 0),
                'catches': catches_by_day.get(day, 0),
                'ar': ar_by_day.get(day, 0),
                'new_users': users_by_day.get(day, 0),
                'revenue': revenue_by_day.get(day, 0.0),
            })
            day += timedelta(days=1)

        # ── Breakdowns ───────────────────────────────────────────────────────
        top_spots = [
            {'name': r['qr_marker__spot__name'] or 'Unknown spot', 'checkins': r['n']}
            for r in scans.values('qr_marker__spot__name').annotate(n=Count('id')).order_by('-n')[:10]
        ]
        activity_types = [
            {'type': key, 'label': ACTIVITY_LABELS.get(key, key), 'count': n}
            for key, n in (
                (r['activity_type'], r['n'])
                for r in logs.values('activity_type').annotate(n=Count('id')).order_by('-n')
            )
        ]
        visitor_types = [
            {
                'type': r['visitor_type'],
                'label': VISITOR_LABELS.get(r['visitor_type'], r['visitor_type']),
                'count': r['n'],
            }
            for r in tourists.values('visitor_type').annotate(n=Count('id')).order_by('-n')
        ]
        trivia_status = {
            r['status']: r['n'] for r in TriviaQuestion.objects.values('status').annotate(n=Count('id'))
        }
        promotion_status = {
            r['status']: r['n'] for r in UserPromotion.objects.values('status').annotate(n=Count('id'))
        }
        top_players = [
            {
                'rank': i,
                'in_game_name': u.in_game_name,
                'visitor_type': u.visitor_type,
                'xp': u.xp,
                'level': level_for_xp(u.xp),
            }
            for i, u in enumerate(
                tourists.filter(is_active=True, in_game_name__isnull=False)
                .exclude(in_game_name='').order_by('-xp', 'date_joined')[:10],
                start=1,
            )
        ]

        revenue = paid.aggregate(total=Sum('amount_php'))
        summary = {
            'total_tourists': tourists.count(),
            'new_users': new_users.count(),
            'active_users': len(
                set(scans.values_list('user_id', flat=True))
                | set(logs.values_list('user_id', flat=True))
            ),
            'qr_checkins': scans.count(),
            'catches': logs.filter(activity_type='catch').count(),
            'ar_detections': logs.filter(activity_type='ar').count(),
            'badges': logs.filter(activity_type='badge').count(),
            'revenue_php': float(revenue['total'] or 0),
            'coins_sold': int(paid.filter(bundle__isnull=False).aggregate(c=Sum('coins_to_add'))['c'] or 0),
            'paid_transactions': paid.count(),
            'promotions_published': promotion_status.get('PUBLISHED', 0),
            'trivia_pending': trivia_status.get('pending', 0),
        }

        return Response({
            'range': {
                'start': start.isoformat(),
                'end': end.isoformat(),
                'days': (end - start).days + 1,
                'timezone': 'Asia/Manila',
            },
            'generated_at': datetime.now(REPORT_TZ).isoformat(),
            'summary': summary,
            'daily': daily,
            'top_spots': top_spots,
            'activity_types': activity_types,
            'visitor_types': visitor_types,
            'trivia_status': trivia_status,
            'promotion_status': promotion_status,
            'top_players': top_players,
        })
