from django.contrib import admin
from .models import Wallet, CoinBundle, UserPromotion, Transaction, AppSetting

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'updated_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')

@admin.register(CoinBundle)
class CoinBundleAdmin(admin.ModelAdmin):
    list_display = ('name', 'coins_amount', 'price_php', 'is_active')
    list_filter = ('is_active',)

@admin.register(UserPromotion)
class UserPromotionAdmin(admin.ModelAdmin):
    list_display = ('user', 'spot_name', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'spot_name')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount_php', 'coins_to_add', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'paymongo_checkout_id')

@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'description')
