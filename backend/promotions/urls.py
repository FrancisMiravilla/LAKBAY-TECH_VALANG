from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WalletRetrieveView,
    CoinBundleListView,
    UserPromotionViewSet,
    CreatePayMongoCheckoutView,
    PayMongoWebhookView,
    PublishPromotionView,
    AppSettingViewSet,
    PublishedPromotionListView
)

router = DefaultRouter()
router.register(r'promotions', UserPromotionViewSet, basename='promotions')
router.register(r'settings', AppSettingViewSet, basename='settings')

urlpatterns = [
    path('wallet/', WalletRetrieveView.as_view(), name='wallet-detail'),
    path('bundles/', CoinBundleListView.as_view(), name='bundle-list'),
    path('checkout/', CreatePayMongoCheckoutView.as_view(), name='create-checkout'),
    path('webhook/paymongo/', PayMongoWebhookView.as_view(), name='paymongo-webhook'),
    path('published/', PublishedPromotionListView.as_view(), name='published-promotions'),
    path('promotions/<int:pk>/publish/', PublishPromotionView.as_view(), name='publish-promotion'),
    path('', include(router.urls)),
]
