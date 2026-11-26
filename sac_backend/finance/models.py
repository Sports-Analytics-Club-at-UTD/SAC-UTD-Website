from decimal import Decimal
import uuid

from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class BudgetCategory(models.Model):
    """
    e.g. "Events", "Marketing", "Merch", "Travel", "R&D Equipment".
    Kept as its own table (rather than a free-text field) so the Finance
    Director's charts can group/aggregate cleanly.
    """

    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class BudgetEntry(TimeStampedModel):
    """
    A single income or expense line — this is the "new Excel" for the
    Finance Director. The frontend charts (spend by category, income vs
    expense over time, running balance) are all just aggregations over
    this table.
    """

    class EntryType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    category = models.ForeignKey(BudgetCategory, on_delete=models.PROTECT, related_name="entries")
    entry_type = models.CharField(max_length=10, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    date = models.DateField()

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="budget_entries"
    )

    # Optional link back to the event/project that generated the cost,
    # useful once Stripe integration lands (payment -> entry).
    related_event = models.ForeignKey(
        "events.Event", on_delete=models.SET_NULL, null=True, blank=True, related_name="budget_entries"
    )
    stripe_payment_id = models.CharField(max_length=255, blank=True)

    class Meta(TimeStampedModel.Meta):
        ordering = ["-date"]
        verbose_name_plural = "Budget entries"

    def __str__(self):
        sign = "+" if self.entry_type == self.EntryType.INCOME else "-"
        return f"{sign}${self.amount} {self.category} ({self.date})"


class FundingRequest(TimeStampedModel):
    """
    A club funding request submitted by any authenticated member and reviewed by
    the Finance Director through a strict state machine:
    unchecked -> approved | modified | denied, and modified -> approved.
    """

    class Scope(models.TextChoices):
        SPECIFIC_EVENT = "specific_event", "Specific Event"
        PROJECTS_TEAM = "projects_team", "Projects Team"
        MISCELLANEOUS = "miscellaneous", "Miscellaneous"

    class EventClassification(models.TextChoices):
        SOCIAL = "social", "Social"
        WORKSHOP = "workshop", "Workshop"
        SPEAKER_EVENT = "speaker_event", "Speaker Event"
        PROJECTS = "projects", "Projects"

    class Status(models.TextChoices):
        UNCHECKED = "unchecked", "Unchecked"
        APPROVED = "approved", "Approved"
        MODIFIED = "modified", "Modified"
        DENIED = "denied", "Denied"

    class FundingSource(models.TextChoices):
        CLUB_FUNDS = "club_funds", "Club Funds"
        UTD_PROGRAMMING_FUNDS = "utd_programming_funds", "UTD Programming Funds"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="funding_requests",
    )
    requester_email = models.EmailField(blank=True)
    title = models.CharField(max_length=200)
    scope = models.CharField(max_length=32, choices=Scope.choices)

    # Clean FK to Events Dashboard without modifying events.Event
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="funding_requests",
    )
    event_classification = models.CharField(
        max_length=32, choices=EventClassification.choices, blank=True
    )
    event_name = models.CharField(max_length=200, blank=True)
    event_description = models.TextField(blank=True)
    event_date = models.DateField(null=True, blank=True)
    event_start_time = models.TimeField(null=True, blank=True)
    event_end_time = models.TimeField(null=True, blank=True)
    event_lead = models.CharField(max_length=150, blank=True)
    event_lead_email = models.EmailField(blank=True)
    event_estimated_attendance = models.PositiveIntegerField(null=True, blank=True)
    room_number = models.CharField(max_length=64, blank=True)
    reservation_id = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UNCHECKED,
        db_index=True,
    )
    funding_source = models.CharField(
        max_length=32,
        choices=FundingSource.choices,
        blank=True,
        db_index=True,
    )
    utd_form_required = models.BooleanField(default=False)
    utd_form_completed = models.BooleanField(default=False)
    utd_form_completed_at = models.DateTimeField(null=True, blank=True)

    approval_id = models.CharField(
        max_length=32, unique=True, null=True, blank=True, db_index=True
    )
    denial_reason = models.TextField(blank=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_funding_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmation_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    include_tax = models.BooleanField(default=True)
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.0825")
    )

    class Meta(TimeStampedModel.Meta):
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.status}] {self.title} ({self.approval_id or 'pending'})"

    @property
    def subtotal_amount(self) -> Decimal:
        total = Decimal("0.00")
        for item in self.items.all():
            total += item.line_total
        return total.quantize(Decimal("0.01"))

    @property
    def tax_amount(self) -> Decimal:
        if not self.include_tax:
            return Decimal("0.00")
        return (self.subtotal_amount * self.tax_rate).quantize(Decimal("0.01"))

    @property
    def total_amount(self) -> Decimal:
        return (self.subtotal_amount + self.tax_amount).quantize(Decimal("0.01"))

    @property
    def effective_requester_email(self) -> str:
        if self.requester_email:
            return self.requester_email
        if self.requester_id and self.requester.email:
            return self.requester.email
        return ""


class FundingRequestItem(TimeStampedModel):
    """A single line item inside a FundingRequest's spreadsheet grid."""

    class Category(models.TextChoices):
        PUBLICITY_MARKETING = "publicity_marketing", "Publicity and Marketing"
        DECORATIONS_SUPPLIES = "decorations_supplies", "Decorations and Supplies"
        FOOD = "food", "Food and Drinks"
        FACILITIES = "facilities", "Facilities"
        ENTERTAINMENT = "entertainment", "Entertainment"
        EVENT_PERSONNEL = "event_personnel", "Event Personnel"
        EQUIPMENT_RENTAL = "equipment_rental", "Equipment Rental"
        TECHNOLOGY = "technology", "Technology"
        MISCELLANEOUS = "miscellaneous", "Miscellaneous"
        # Legacy values preserved for backwards compatibility
        LOGISTICS = "logistics", "Logistics"
        MERCHANDISE = "merchandise", "Merchandise"
        PRIZES = "prizes", "Prizes"

    funding_request = models.ForeignKey(
        FundingRequest, on_delete=models.CASCADE, related_name="items"
    )
    item_name = models.CharField(max_length=200)
    vendor = models.CharField(max_length=150, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_quantity = models.CharField(max_length=64, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=32, choices=Category.choices)
    item_url = models.URLField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta(TimeStampedModel.Meta):
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.item_name} ({self.quantity} x ${self.unit_price})"

    @property
    def line_total(self) -> Decimal:
        return (self.quantity * self.unit_price).quantize(Decimal("0.01"))


class FundingRequestModificationLog(TimeStampedModel):
    """Audit record of line-item edits when a Finance Director modifies a request."""

    funding_request = models.ForeignKey(
        FundingRequest, on_delete=models.CASCADE, related_name="modification_logs"
    )
    modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="funding_modification_logs",
    )
    summary = models.TextField(blank=True)
    diff = models.JSONField(default=dict)

    class Meta(TimeStampedModel.Meta):
        ordering = ["-created_at"]

    def __str__(self):
        return f"Modification on #{self.funding_request_id} at {self.created_at}"


class RefundRequest(TimeStampedModel):
    """
    Reimbursement request submitted by a member who purchased approved items,
    referencing an approved FundingRequest's approval_id and a private receipt.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REIMBURSED = "reimbursed", "Reimbursed"
        REJECTED = "rejected", "Rejected"

    funding_request = models.ForeignKey(
        FundingRequest, on_delete=models.PROTECT, related_name="refund_requests"
    )
    approval_id_entered = models.CharField(max_length=32)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="refund_requests",
    )
    amount_claimed = models.DecimalField(max_digits=10, decimal_places=2)

    receipt_storage_path = models.CharField(max_length=500)
    receipt_original_filename = models.CharField(max_length=255)
    receipt_content_type = models.CharField(max_length=100, blank=True)
    comments = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_refund_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    director_notes = models.TextField(blank=True)

    class Meta(TimeStampedModel.Meta):
        ordering = ["-created_at"]

    def __str__(self):
        return f"Refund #{self.pk} for {self.approval_id_entered} ({self.status})"
