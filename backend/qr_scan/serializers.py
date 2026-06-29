import base64
import uuid
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import CulturalSpot, QRMarker, QRScan, TriviaQuestion, TriviaAttempt

class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            format, imgstr = data.split(';base64,') 
            ext = format.split('/')[-1]
            data = ContentFile(base64.b64decode(imgstr), name=f"{uuid.uuid4().hex}.{ext}")
        return super().to_internal_value(data)


class CulturalSpotSerializer(serializers.ModelSerializer):
    image = Base64ImageField(required=False, allow_null=True)
    image2 = Base64ImageField(required=False, allow_null=True)
    image3 = Base64ImageField(required=False, allow_null=True)
    
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


