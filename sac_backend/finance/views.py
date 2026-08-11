from django.db.models import Sum
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Role
from .models import BudgetCategory, BudgetEntry
from .serializers import BudgetCategorySerializer, BudgetEntrySerializer


class IsFinanceDirectorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        user = request.user
        return bool(
            user.is_authenticated
            and (user.is_superuser or user.role in (Role.DIRECTOR_FINANCE, Role.EXEC))
        )


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsFinanceDirectorOrReadOnly]


class BudgetEntryViewSet(viewsets.ModelViewSet):
    """
    /api/finance/entries/                CRUD, filter with ?category=&entry_type=&date_after=
    /api/finance/entries/summary/        aggregated totals for chart widgets
    """

    queryset = BudgetEntry.objects.select_related("category")
    serializer_class = BudgetEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsFinanceDirectorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.get_queryset()
        income = qs.filter(entry_type=BudgetEntry.EntryType.INCOME).aggregate(total=Sum("amount"))["total"] or 0
        expense = qs.filter(entry_type=BudgetEntry.EntryType.EXPENSE).aggregate(total=Sum("amount"))["total"] or 0
        by_category = (
            qs.values("category__name", "entry_type")
            .annotate(total=Sum("amount"))
            .order_by("category__name")
        )
        return Response(
            {
                "total_income": income,
                "total_expense": expense,
                "balance": income - expense,
                "by_category": list(by_category),
            }
        )
