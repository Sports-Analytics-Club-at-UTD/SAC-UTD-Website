from django.contrib import admin

from .models import (
    BudgetCategory,
    BudgetEntry,
    ClubTreasury,
    FundingRequest,
    FundingRequestItem,
    FundingRequestModificationLog,
    RefundRequest,
    SemesterBudget,
)


@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(BudgetEntry)
class BudgetEntryAdmin(admin.ModelAdmin):
    list_display = ("date", "category", "entry_type", "amount", "recorded_by")
    list_filter = ("entry_type", "category")
    search_fields = ("description",)


class FundingRequestItemInline(admin.TabularInline):
    model = FundingRequestItem
    extra = 0


@admin.register(FundingRequest)
class FundingRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "scope",
        "status",
        "funding_source",
        "approval_id",
        "requester",
        "created_at",
    )
    list_filter = ("status", "scope", "funding_source", "event_classification")
    search_fields = ("title", "approval_id", "requester__username", "reservation_id")
    inlines = [FundingRequestItemInline]


@admin.register(FundingRequestModificationLog)
class FundingRequestModificationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "funding_request", "modified_by", "created_at")


@admin.register(RefundRequest)
class RefundRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "approval_id_entered",
        "requester",
        "amount_claimed",
        "status",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("approval_id_entered", "requester__username")


@admin.register(ClubTreasury)
class ClubTreasuryAdmin(admin.ModelAdmin):
    list_display = ("id", "current_balance", "updated_by", "updated_at")


@admin.register(SemesterBudget)
class SemesterBudgetAdmin(admin.ModelAdmin):
    list_display = (
        "semester_key",
        "label",
        "spending_goal",
        "fundraising_goal",
        "fundraising_raised",
        "updated_at",
    )
    search_fields = ("semester_key", "label")
