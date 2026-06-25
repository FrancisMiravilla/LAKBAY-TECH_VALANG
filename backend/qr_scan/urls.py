from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ValidateQRView, UserQRScansView,
    CulturalSpotViewSet, QRMarkerViewSet,
    SpotTriviaView, AwardSpotBadgeView,
)

router = DefaultRouter()
router.register(r'spots', CulturalSpotViewSet, basename='spots')
router.register(r'markers', QRMarkerViewSet, basename='markers')

urlpatterns = [
    path('', include(router.urls)),
    path('validate/', ValidateQRView.as_view(), name='qr_validate'),
    path('my-scans/', UserQRScansView.as_view(), name='qr_my_scans'),
    path('spots/<int:spot_id>/trivia/', SpotTriviaView.as_view(), name='spot_trivia'),
    path('spots/<int:spot_id>/award-badge/', AwardSpotBadgeView.as_view(), name='award_badge'),
]
