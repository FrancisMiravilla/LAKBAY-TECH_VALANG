from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, GoogleLoginView, LogoutView, 
    CharacterSetupView, ProfileView, ProfileUpdateView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('character-setup/', CharacterSetupView.as_view(), name='character_setup'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/update/', ProfileUpdateView.as_view(), name='profile_update'),
]
