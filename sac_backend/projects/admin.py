from django.contrib import admin

from .models import Project, Task


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "lead")
    list_filter = ("status",)
    search_fields = ("name",)
    filter_horizontal = ("members",)
    inlines = [TaskInline]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "column", "assigned_to", "due_date", "order")
    list_filter = ("column", "project")
    search_fields = ("title",)
