from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MediaUploadViewSet

app_name = "media_hub"

router = DefaultRouter()
router.register(r"uploads", MediaUploadViewSet, basename="media-upload")

urlpatterns = [
    # All routes are cleanly handled by the router (including /api/media/uploads/ and /api/media/uploads/approved/)
    path('', include(router.urls)),
]