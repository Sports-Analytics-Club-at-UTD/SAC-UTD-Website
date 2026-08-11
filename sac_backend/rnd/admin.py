from django.contrib import admin

from .models import Idea, IndustryConnection, RndTodo, WorkshopItem


@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "submitted_by")
    list_filter = ("status",)


@admin.register(IndustryConnection)
class IndustryConnectionAdmin(admin.ModelAdmin):
    list_display = ("org_name", "contact_name", "contact_email", "last_contacted")


@admin.register(RndTodo)
class RndTodoAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "assigned_to")
    list_filter = ("status",)


@admin.register(WorkshopItem)
class WorkshopItemAdmin(admin.ModelAdmin):
    list_display = ("title", "uploaded_by")
