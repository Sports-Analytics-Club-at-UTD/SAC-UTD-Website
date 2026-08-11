from django.contrib import admin

from .models import Request


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "submitted_by", "resolved_by")
    list_filter = ("category", "status")
    search_fields = ("title", "description")
