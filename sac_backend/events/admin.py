from django.contrib import admin

from .models import Event, EventRegistration


class EventRegistrationInline(admin.TabularInline):
    model = EventRegistration
    extra = 0


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "start_time", "location", "registration_count", "created_by")
    list_filter = ("date",)
    search_fields = ("name", "location")
    inlines = [EventRegistrationInline]
