from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'in_game_name', 'chosen_character', 'profile_photo', 'auth_provider', 'date_joined', 'is_active')
        read_only_fields = ('id', 'email', 'auth_provider', 'date_joined', 'is_active')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    in_game_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    chosen_character = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ('full_name', 'email', 'password', 'confirm_password', 'in_game_name', 'chosen_character')

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        in_game_name = validated_data.get('in_game_name')
        if not in_game_name:
            in_game_name = None
            
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            in_game_name=in_game_name,
            chosen_character=validated_data.get('chosen_character')
        )
        return user

class CharacterSetupSerializer(serializers.ModelSerializer):
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

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name', 'in_game_name', 'chosen_character', 'profile_photo')

    def validate_in_game_name(self, value):
        if not value:
            return None
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(in_game_name=value).exists():
            raise serializers.ValidationError("This in-game name is already taken.")
        return value
