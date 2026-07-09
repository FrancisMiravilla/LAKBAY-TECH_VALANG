from rest_framework import serializers
from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer as DjoserUserCreateSerializer
from djoser.serializers import UserSerializer as DjoserUserSerializer

User = get_user_model()

class CustomUserCreateSerializer(DjoserUserCreateSerializer):
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)
    middle_initial = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta(DjoserUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'middle_initial', 'in_game_name', 'chosen_character', 'location', 'is_staff','is_superuser',)

    def create(self, validated_data):
        # Compose the display name from the individual parts supplied at sign-up.
        validated_data['full_name'] = User.compose_full_name(
            validated_data.get('first_name', ''),
            validated_data.get('last_name', ''),
            validated_data.get('middle_initial', ''),
        )
        # Derive local/tourist from the location supplied at sign-up.
        validated_data['visitor_type'] = User.classify_visitor_type(
            validated_data.get('location', '')
        )
        return super().create(validated_data)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'in_game_name', 'chosen_character', 'profile_photo', 'auth_provider', 'date_joined', 'is_active', 'is_staff', 'xp', 'role', 'location', 'visitor_type',)
        read_only_fields = ('id', 'email', 'auth_provider', 'date_joined', 'is_active', 'is_staff', 'xp', 'visitor_type',)


class AdminUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    spots_visited = serializers.IntegerField(read_only=True)
    badges_earned = serializers.IntegerField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'in_game_name', 'chosen_character',
                  'auth_provider', 'date_joined', 'is_active', 'is_staff',
                  'spots_visited', 'badges_earned', 'status', 'role',
                  'location', 'visitor_type')

    def get_name(self, obj):
        return obj.full_name or obj.email

    def get_status(self, obj):
        return 'Active' if obj.is_active else 'Suspended'


class CharacterSetupSerializer(DjoserUserSerializer):
    class Meta:
        model = User
        fields = ('in_game_name', 'chosen_character')

    def validate_in_game_name(self, value):
        if not value:
            return None
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(in_game_name=value).exists():
            raise serializers.ValidationError("This in-game name is already taken.")
        return value
