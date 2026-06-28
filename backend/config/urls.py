from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from qr_scan.views import model_viewer_page

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/quiz/', include('quiz.urls')),
    path('api/qr/', include('qr_scan.urls')),
    path('model-viewer/', model_viewer_page, name='model_viewer'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
