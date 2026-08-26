from rest_framework.routers import DefaultRouter

from .views import BudgetCategoryViewSet, BudgetEntryViewSet

app_name = "finance"

router = DefaultRouter()
router.register(r"categories", BudgetCategoryViewSet, basename="budget-category")
router.register(r"entries", BudgetEntryViewSet, basename="budget-entry")

urlpatterns = router.urls
