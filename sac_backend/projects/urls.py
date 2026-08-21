from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, TaskViewSet

app_name = "projects"

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"", ProjectViewSet, basename="project")

urlpatterns = router.urls
