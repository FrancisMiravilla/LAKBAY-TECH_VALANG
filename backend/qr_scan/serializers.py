from rest_framework import serializers
from .models import CulturalSpot, QRMarker, QRScan, TriviaQuestion


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
    correct_answer = serializers.SerializerMethodField()

    class Meta:
        model = TriviaQuestion
        fields = ('id', 'question', 'choices', 'correct_answer')

    def get_correct_answer(self, obj):
        try:
            return obj.choices[obj.correct_index]
        except (IndexError, TypeError):
            return None