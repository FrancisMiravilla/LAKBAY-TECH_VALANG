from rest_framework import serializers
from .models import Wallet, CoinBundle, UserPromotion, Transaction, AppSetting

class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ['balance', 'updated_at']

class CoinBundleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoinBundle
        fields = ['id', 'name', 'description', 'coins_amount', 'price_php', 'is_active']

class UserPromotionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPromotion
        fields = (
            'id', 'user_name', 'spot_name', 'description', 
            'image_file', 'model_3d_file', 'latitude', 'longitude',
            'status', 'rejection_reason', 'created_at', 'updated_at'
        )
        read_only_fields = ['status', 'rejection_reason']
        
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
