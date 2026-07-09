import base64
import uuid
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import CulturalSpot, QRMarker, QRScan, TriviaQuestion, TriviaAttempt, CulturalIcon, ARTarget
from .glb_utils import strip_incompatible_extensions
class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            format, imgstr = data.split(';base64,') 
            ext = format.split('/')[-1]
            data = ContentFile(base64.b64decode(imgstr), name=f"{uuid.uuid4().hex}.{ext}")
        return super().to_internal_value(data)

class Base64FileField(serializers.FileField):
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:'):
            # Format: data:<mime_type>;base64,<data>
            format, filestr = data.split(';base64,')
            ext = 'glb'
            raw = base64.b64decode(filestr)
            # Strip glTF material extensions Viro's mobile AR loader can't parse
            # (e.g. KHR_materials_sheen), otherwise the model is invisible in AR.
            raw = strip_incompatible_extensions(raw)
            data = ContentFile(raw, name=f"{uuid.uuid4().hex}.{ext}")
        return super().to_internal_value(data)


class CulturalSpotSerializer(serializers.ModelSerializer):
    image = Base64ImageField(required=False, allow_null=True)
    image2 = Base64ImageField(required=False, allow_null=True)
    image3 = Base64ImageField(required=False, allow_null=True)
    model_3d = Base64FileField(required=False, allow_null=True)
    
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
    """Mobile trivia serializer."""
    class Meta:
        model = TriviaQuestion
        fields = ('id', 'question', 'choices', 'correct_index', 'explanation')


class TriviaQuestionAdminSerializer(serializers.ModelSerializer):
    """Admin/Guide-only — includes correct_index and workflow fields."""
    spot_id = serializers.PrimaryKeyRelatedField(
        queryset=CulturalSpot.objects.all(), source='spot', write_only=True, required=False, allow_null=True
    )
    spot_name = serializers.CharField(source='spot.name', read_only=True)
    icon_id = serializers.PrimaryKeyRelatedField(
        queryset=CulturalIcon.objects.all(), source='icon', write_only=True, required=False, allow_null=True
    )
    icon_name = serializers.CharField(source='icon.name', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)

    class Meta:
        model = TriviaQuestion
        fields = (
            'id', 'spot_id', 'spot_name', 'icon_id', 'icon_name', 
            'question', 'choices', 'correct_index', 'explanation',
            'status', 'generated_by', 'generated_by_name', 
            'reviewed_by', 'reviewed_by_name', 'review_date', 'updated_at'
        )


class TriviaAttemptSerializer(serializers.ModelSerializer):
    spot_name = serializers.CharField(source='spot.name', read_only=True)

    class Meta:
        model = TriviaAttempt
        fields = '__all__'



class CulturalIconSerializer(serializers.ModelSerializer):
    model_3d = Base64FileField(required=False, allow_null=True)

    class Meta:
        model = CulturalIcon
        fields = '__all__'


class ARTargetSerializer(serializers.ModelSerializer):
    image = Base64ImageField(required=False, allow_null=True)
    model_3d = Base64FileField(required=False, allow_null=True)

    class Meta:
        model = ARTarget
        fields = '__all__'
