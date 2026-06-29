from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ValidateQRView, UserQRScansView,
    CulturalSpotViewSet, QRMarkerViewSet, TriviaQuestionViewSet,
    SpotTriviaView, SubmitTriviaView, GenerateAITriviaView,
    CulturalIconViewSet, GenerateIconAITriviaView
)

router = DefaultRouter()
router.register(r'spots', CulturalSpotViewSet, basename='spots')
router.register(r'markers', QRMarkerViewSet, basename='markers')
router.register(r'trivia-questions', TriviaQuestionViewSet, basename='trivia-questions')
router.register(r'catch-icons', CulturalIconViewSet, basename='catch-icons')

urlpatterns = [
    path('', include(router.urls)),
    path('validate/', ValidateQRView.as_view(), name='qr_validate'),
    path('my-scans/', UserQRScansView.as_view(), name='qr_my_scans'),
    path('spots/<int:spot_id>/trivia/', SpotTriviaView.as_view(), name='spot_trivia'),
    path('spots/<int:spot_id>/trivia/submit/', SubmitTriviaView.as_view(), name='spot_trivia_submit'),
    path('spots/<int:spot_id>/ai-trivia/', GenerateAITriviaView.as_view(), name='spot_ai_trivia'),
    path('catch-icons/<int:icon_id>/ai-trivia/', GenerateIconAITriviaView.as_view(), name='icon_ai_trivia'),
]
