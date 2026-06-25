from rest_framework import serializers
from .models import CulturalSpot, QRMarker, QRScan


class CulturalSpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CulturalSpot
        fields = '__all__'


class QRMarkerSerializer(serializers.ModelSerializer):
    spot = CulturalSpotSerializer(read_only=True)

    class Meta:
        model = QRMarker
        fields = ('id', 'qr_code_string', 'spot', 'bonus_creature', 'unlock_type', 'is_active')


class QRScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRScan
        fields = ('id', 'qr_marker', 'scanned_at')