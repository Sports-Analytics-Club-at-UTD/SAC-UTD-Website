from rest_framework.routers import DefaultRouter

from .views import IdeaViewSet, IndustryConnectionViewSet, RndTodoViewSet, WorkshopItemViewSet

app_name = "rnd"

router = DefaultRouter()
router.register(r"ideas", IdeaViewSet, basename="idea")
router.register(r"connections", IndustryConnectionViewSet, basename="industry-connection")
router.register(r"todos", RndTodoViewSet, basename="rnd-todo")
router.register(r"workshop", WorkshopItemViewSet, basename="workshop-item")

urlpatterns = router.urls
