from rest_framework import serializers
from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer as DjoserUserCreateSerializer
from djoser.serializers import UserSerializer as DjoserUserSerializer

User = get_user_model()

class CustomUserCreateSerializer(DjoserUserCreateSerializer):
    class Meta(DjoserUserCreateSerializer.Meta):
        model = User
        fields = ('id', 'email', 'password', 'full_name', 'in_game_name', 'chosen_character', 'is_staff','is_superuser',)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'in_game_name', 'chosen_character', 'profile_photo', 'auth_provider', 'date_joined', 'is_active', 'is_staff',)
        read_only_fields = ('id', 'email', 'auth_provider', 'date_joined', 'is_active', 'is_staff',)


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
