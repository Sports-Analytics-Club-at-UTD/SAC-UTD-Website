from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Payment(TimeStampedModel):
    """
    One Stripe Checkout attempt. Created in `pending` status the moment
    a checkout session is created; flipped to `succeeded`/`failed`/
    `expired` ONLY by the webhook handler (payments.views.StripeWebhookView)
    — never by the frontend's post-payment redirect callback. A redirect
    can be spoofed, or simply never happen (closed tab, dead network) in
    ways a server-to-server, signature-verified webhook call cannot. The
    webhook is the single source of truth for "did this actually get paid."
    """

    class Purpose(models.TextChoices):
        EVENT_REGISTRATION = "event_registration", "Event Registration"
        MEMBERSHIP_DUES = "membership_dues", "Membership Dues"
        DONATION = "donation", "Donation"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="payments"
    )
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Dollars, matching finance.BudgetEntry's convention — converted to
    # cents only at the Stripe API boundary (see stripe_client.py).
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="usd")

    # Only ever set when purpose == EVENT_REGISTRATION.
    related_event = models.ForeignKey(
        "events.Event", on_delete=models.SET_NULL, null=True, blank=True, related_name="payments"
    )

    stripe_checkout_session_id = models.CharField(max_length=255, unique=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)

    # Set once the webhook processes a successful payment — gives the
    # Finance Director a direct, traceable link from "someone paid" to
    # "here's the budget line it created," without manual re-entry.
    budget_entry = models.OneToOneField(
        "finance.BudgetEntry", on_delete=models.SET_NULL, null=True, blank=True, related_name="payment"
    )

    class Meta(TimeStampedModel.Meta):
        pass

    def __str__(self):
        return f"{self.get_purpose_display()} — ${self.amount} ({self.status})"