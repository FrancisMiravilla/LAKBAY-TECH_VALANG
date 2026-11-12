from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from djoser.views import UserViewSet
from .serializers import LoginSerializer
from .views import (
    GoogleLoginView, LogoutView,
    CharacterSetupView, test_auth,
    UserListView, ToggleUserStatusView,
    AdjustUserXPView, LeaderboardView, CosmeticsView,
    VerifyEmailView, ResendVerificationCodeView,
)

urlpatterns = [
    path('register/', UserViewSet.as_view({'post': 'create'}), name='register'),
    path('profile/', UserViewSet.as_view({'get': 'me', 'put': 'me', 'patch': 'me'}), name='profile'),
    path('adjust-xp/', AdjustUserXPView.as_view(), name='adjust_xp'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('cosmetics/', CosmeticsView.as_view(), name='cosmetics'),

    path('login/', TokenObtainPairView.as_view(serializer_class=LoginSerializer), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-code/', ResendVerificationCodeView.as_view(), name='resend_code'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('character-setup/', CharacterSetupView.as_view(), name='character_setup'),
    path("test-auth/", test_auth),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:user_id>/toggle-status/', ToggleUserStatusView.as_view(), name='toggle_user_status'),
]
