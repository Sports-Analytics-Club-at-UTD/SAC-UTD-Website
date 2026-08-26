from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Request(TimeStampedModel):
    """
    General-purpose request/ticket that any director (or officer) can
    file from their own portal page for Exec to handle — e.g. "need
    budget approval", "need a bug fixed on the site", "need sign-off on
    a marketing post". The Exec Page is just a filtered/sortable list
    view over this table.
    """

    class Category(models.TextChoices):
        BUDGET = "budget", "Budget / Finance"
        SITE_BUG = "site_bug", "Website Bug"
        APPROVAL = "approval", "Approval Needed"
        GENERAL = "general", "General"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"
        DECLINED = "declined", "Declined"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="requests_submitted"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requests_resolved",
    )
    resolution_note = models.TextField(blank=True)

    # Set True if Dale (or whoever's Exec) wants an email when a new
    # request comes in, rather than just checking the Exec Page.
    notify_exec = models.BooleanField(default=True)

    class Meta(TimeStampedModel.Meta):
        pass

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"
