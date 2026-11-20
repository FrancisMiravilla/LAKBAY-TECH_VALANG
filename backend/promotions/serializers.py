from rest_framework import serializers
from qr_scan.reviews import rounded_average
from . import lifecycle
from .models import Wallet, CoinBundle, UserPromotion, Transaction, AppSetting

class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ['balance', 'updated_at']

class CoinBundleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoinBundle
        fields = ['id', 'name', 'description', 'coins_amount', 'price_php', 'image', 'is_active']

class UserPromotionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    days_left = serializers.SerializerMethodField()
    renewal_due = serializers.SerializerMethodField()

    class Meta:
        model = UserPromotion
        fields = (
            'id', 'user_name', 'spot_name', 'description',
            'image_file', 'image_file2', 'image_file3', 'model_3d_file', 'latitude', 'longitude',
            'is_place',
            'status', 'rejection_reason', 'created_at', 'updated_at',
            'rating_avg', 'rating_count', 'is_mine',
            'published_at', 'expires_at', 'reminder_sent_at', 'days_left', 'renewal_due',
        )
        read_only_fields = ['status', 'rejection_reason', 'published_at', 'expires_at', 'reminder_sent_at']

    def get_days_left(self, obj):
        return lifecycle.days_left(obj) if obj.status == 'PUBLISHED' else None

    def get_renewal_due(self, obj):
        """True when the owner should renew: expired, or inside the reminder window."""
        if obj.status == 'EXPIRED':
            return True
        left = self.get_days_left(obj)
        return left is not None and left <= self.context.setdefault(
            'reminder_days', lifecycle.setting('PROMOTION_REMINDER_DAYS'),
        )

    def get_rating_avg(self, obj):
        return rounded_average(getattr(obj, 'rating_avg', None))

    def get_rating_count(self, obj):
        return getattr(obj, 'rating_count', 0) or 0

    def get_is_mine(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and user.is_authenticated and obj.user_id == user.id)

    def get_user_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        if full_name:
            return full_name
        
        username = getattr(obj.user, 'username', '')
        if username:
            return username
            
        email = getattr(obj.user, 'email', '')
        if email:
            return email
            
        return "Unknown User"

class TransactionSerializer(serializers.ModelSerializer):
    bundle_name = serializers.CharField(source='bundle.name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = ['id', 'bundle_name', 'amount_php', 'coins_to_add', 'status', 'created_at']

class AppSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSetting
        fields = ['key', 'value', 'description']
