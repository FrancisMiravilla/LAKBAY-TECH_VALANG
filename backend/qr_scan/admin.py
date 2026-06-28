from django.contrib import admin
from .models import CulturalSpot, QRMarker, QRScan, TriviaQuestion, SpotBadge, TriviaAttempt


@admin.register(CulturalSpot)
class CulturalSpotAdmin(admin.ModelAdmin):
    list_display = ('name', 'location_name', 'latitude', 'longitude')
    search_fields = ('name', 'location_name')


@admin.register(QRMarker)
class QRMarkerAdmin(admin.ModelAdmin):
    list_display = ('spot', 'qr_code_string', 'unlock_type', 'is_active', 'scan_count')
    list_filter = ('is_active', 'unlock_type')
    search_fields = ('qr_code_string', 'spot__name')


@admin.register(QRScan)
class QRScanAdmin(admin.ModelAdmin):
    list_display = ('user', 'qr_marker', 'scanned_at')
    list_filter = ('scanned_at',)


@admin.register(TriviaQuestion)
class TriviaQuestionAdmin(admin.ModelAdmin):
    list_display = ('spot', 'question', 'correct_index')
    list_filter = ('spot',)
    search_fields = ('question', 'spot__name')


@admin.register(SpotBadge)
class SpotBadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'spot', 'awarded_at')
    list_filter = ('spot', 'awarded_at')
    search_fields = ('user__email', 'spot__name')


@admin.register(TriviaAttempt)
class TriviaAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'spot', 'score', 'total', 'passed', 'attempted_at')
    list_filter = ('passed', 'spot', 'attempted_at')
    search_fields = ('user__email', 'spot__name')
