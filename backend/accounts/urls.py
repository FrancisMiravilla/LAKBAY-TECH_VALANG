from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from djoser.views import UserViewSet
from .views import (
    GoogleLoginView, LogoutView, 
    CharacterSetupView, test_auth,
)

urlpatterns = [
    path('register/', UserViewSet.as_view({'post': 'create'}), name='register'),
    path('profile/', UserViewSet.as_view({'get': 'me', 'put': 'me', 'patch': 'me'}), name='profile'),

    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('character-setup/', CharacterSetupView.as_view(), name='character_setup'),
    path("test-auth/", test_auth),

]
