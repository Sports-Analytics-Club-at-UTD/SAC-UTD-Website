from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "role", "is_approved", "is_staff", "date_joined")
    list_filter = ("role", "is_approved", "is_staff", "is_superuser")
    search_fields = ("username", "email", "first_name", "last_name")

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "SAC Profile",
            {
                "fields": (
                    "role", "is_approved",
                    "grade", "major", "interests",
                    "favorite_sport", "favorite_team", "bio",
                )
            },
        ),
    )
