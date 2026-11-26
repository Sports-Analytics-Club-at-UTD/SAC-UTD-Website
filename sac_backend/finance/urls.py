from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ApprovalLookupView,
    BudgetCategoryViewSet,
    BudgetEntryViewSet,
    CostAnalyticsCsvExportView,
    CostAnalyticsView,
    FundingRequestViewSet,
    RefundRequestViewSet,
    UtdQuotaView,
)

app_name = "finance"

router = DefaultRouter()
router.register(r"categories", BudgetCategoryViewSet, basename="budget-category")
router.register(r"entries", BudgetEntryViewSet, basename="budget-entry")
router.register(r"funding-requests", FundingRequestViewSet, basename="funding-request")
router.register(r"refund-requests", RefundRequestViewSet, basename="refund-request")

urlpatterns = [
    path("utd-quota/", UtdQuotaView.as_view(), name="utd-quota"),
    path("approval-lookup/", ApprovalLookupView.as_view(), name="approval-lookup"),
    path("analytics/", CostAnalyticsView.as_view(), name="analytics"),
    path(
        "analytics/export.csv",
        CostAnalyticsCsvExportView.as_view(),
        name="analytics-export-csv",
    ),
] + router.urls
