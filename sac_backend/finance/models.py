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
