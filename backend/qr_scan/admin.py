from django.contrib import admin
from .models import CulturalSpot, QRMarker, QRScan

# Register your models here.
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