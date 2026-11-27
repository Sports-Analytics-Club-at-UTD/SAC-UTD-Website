from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ApprovalLookupView,
    BudgetCategoryViewSet,
    BudgetEntryViewSet,
    ClubTreasuryUpdateView,
    CostAnalyticsCsvExportView,
    CostAnalyticsView,
    FundingRequestViewSet,
    GlobalBudgetView,
    RefundRequestViewSet,
    SemesterBudgetUpsertView,
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
    path("global-budget/", GlobalBudgetView.as_view(), name="global-budget"),
    path(
        "global-budget/treasury/",
        ClubTreasuryUpdateView.as_view(),
        name="global-budget-treasury",
    ),
    path(
        "global-budget/semesters/<str:semester_key>/",
        SemesterBudgetUpsertView.as_view(),
        name="global-budget-semester",
    ),
] + router.urls
