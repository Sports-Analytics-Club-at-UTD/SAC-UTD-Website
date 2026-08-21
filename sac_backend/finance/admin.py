from django.contrib import admin

from .models import BudgetCategory, BudgetEntry


@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(BudgetEntry)
class BudgetEntryAdmin(admin.ModelAdmin):
    list_display = ("date", "category", "entry_type", "amount", "recorded_by")
    list_filter = ("entry_type", "category")
    search_fields = ("description",)
