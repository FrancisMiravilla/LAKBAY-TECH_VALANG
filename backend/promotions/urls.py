from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WalletRetrieveView,
    CoinBundleListView,
    CoinBundleViewSet,
    UserPromotionViewSet,
    CreatePayMongoCheckoutView,
    PayMongoWebhookView,
    PublishPromotionView,
    AppSettingViewSet,
    PublishedPromotionListView,
    CreatePromotionQRPhView,
    VerifyPromotionPaymentView,
    SimulateTestPaymentView,
    CreateBundleQRPhView,
    VerifyBundlePaymentView,
    SimulateTestBundlePaymentView,
)

router = DefaultRouter()
router.register(r'promotions', UserPromotionViewSet, basename='promotions')
router.register(r'settings', AppSettingViewSet, basename='settings')
router.register(r'coin-bundles', CoinBundleViewSet, basename='coin-bundles')

urlpatterns = [
    path('wallet/', WalletRetrieveView.as_view(), name='wallet-detail'),
    path('bundles/', CoinBundleListView.as_view(), name='bundle-list'),
    path('checkout/', CreatePayMongoCheckoutView.as_view(), name='create-checkout'),
    path('create-bundle-qrph/', CreateBundleQRPhView.as_view(), name='create-bundle-qrph'),
    path('verify-bundle-payment/<str:payment_intent_id>/', VerifyBundlePaymentView.as_view(), name='verify-bundle-payment'),
    path('simulate-bundle-payment/', SimulateTestBundlePaymentView.as_view(), name='simulate-bundle-payment'),
    path('create-qrph/', CreatePromotionQRPhView.as_view(), name='create-promotion-qrph'),
    path('verify-qrph/<str:payment_intent_id>/', VerifyPromotionPaymentView.as_view(), name='verify-promotion-qrph'),
    path('simulate-test-payment/', SimulateTestPaymentView.as_view(), name='simulate-test-payment'),
    path('webhook/paymongo/', PayMongoWebhookView.as_view(), name='paymongo-webhook'),
    path('published/', PublishedPromotionListView.as_view(), name='published-promotions'),
    path('promotions/<int:pk>/publish/', PublishPromotionView.as_view(), name='publish-promotion'),
    path('', include(router.urls)),
]
