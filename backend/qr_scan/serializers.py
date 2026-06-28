from rest_framework import serializers
from .models import CulturalSpot, QRMarker, QRScan, TriviaQuestion, TriviaAttempt


class CulturalSpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CulturalSpot
        fields = '__all__'


class QRMarkerSerializer(serializers.ModelSerializer):
    spot = CulturalSpotSerializer(read_only=True)
    spot_id = serializers.PrimaryKeyRelatedField(
        queryset=CulturalSpot.objects.all(), source='spot', write_only=True
    )

    class Meta:
        model = QRMarker
        fields = ('id', 'qr_code_string', 'spot', 'spot_id', 'bonus_creature', 'unlock_type', 'is_active', 'scan_count', 'created_at')


class QRScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRScan
        fields = ('id', 'qr_marker', 'scanned_at')


class TriviaQuestionSerializer(serializers.ModelSerializer):
    """Safe for clients — correct_index is never exposed."""
    class Meta:
        model = TriviaQuestion
        fields = ('id', 'question', 'choices')


class TriviaQuestionAdminSerializer(serializers.ModelSerializer):
    """Admin-only — includes correct_index for create/update."""
    spot_id = serializers.PrimaryKeyRelatedField(
        queryset=CulturalSpot.objects.all(), source='spot', write_only=True
    )
    spot_name = serializers.CharField(source='spot.name', read_only=True)

    class Meta:
        model = TriviaQuestion
        fields = ('id', 'spot_id', 'spot_name', 'question', 'choices', 'correct_index')


class TriviaAttemptSerializer(serializers.ModelSerializer):
    spot_name = serializers.CharField(source='spot.name', read_only=True)

    class Meta:
        model = TriviaAttempt
        fields = ('id', 'spot_name', 'score', 'total', 'passed', 'attempted_at')
