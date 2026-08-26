from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("purpose", "user", "amount", "status", "related_event", "created_at")
    list_filter = ("purpose", "status")
    search_fields = ("user__username", "stripe_checkout_session_id")
    readonly_fields = ("stripe_checkout_session_id", "stripe_payment_intent_id", "budget_entry")