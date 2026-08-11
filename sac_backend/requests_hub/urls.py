from rest_framework.routers import DefaultRouter

from .views import RequestViewSet

app_name = "requests_hub"

router = DefaultRouter()
router.register(r"", RequestViewSet, basename="request")

urlpatterns = router.urls
