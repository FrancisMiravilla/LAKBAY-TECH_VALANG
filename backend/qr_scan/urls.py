from django.urls import path
from .views import ValidateQRView, UserQRScansView

urlpatterns = [
    path('validate/', ValidateQRView.as_view(), name='qr_validate'),
    path('my-scans/', UserQRScansView.as_view(), name='qr_my_scans'),
]