from rest_framework.routers import DefaultRouter

from .views import MediaUploadViewSet

app_name = "media_hub"

router = DefaultRouter()
router.register(r"", MediaUploadViewSet, basename="media-upload")

urlpatterns = router.urls
