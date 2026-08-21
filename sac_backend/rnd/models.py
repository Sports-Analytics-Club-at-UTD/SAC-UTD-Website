from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Idea(TimeStampedModel):
    """An R&D idea/application pitch being tracked toward a project."""

    class Status(models.TextChoices):
        PROPOSED = "proposed", "Proposed"
        IN_REVIEW = "in_review", "In Review"
        APPROVED = "approved", "Approved"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROPOSED)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="ideas_submitted"
    )

    def __str__(self):
        return self.title


class IndustryConnection(TimeStampedModel):
    """A contact/company the R&D Director is tracking a relationship with."""

    org_name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    last_contacted = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.org_name


class RndTodo(TimeStampedModel):
    """R&D Director's general to-do list (site admin, traffic review, etc.)."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="rnd_todos"
    )

    def __str__(self):
        return self.title


class WorkshopItem(TimeStampedModel):
    """
    R&D Officers' internal "workshop folder" — shared scratch space for
    officer-specific project files/links, separate from the Kanban board
    itself (that's projects.Task with project filtered to R&D projects).
    """

    title = models.CharField(max_length=200)
    file = models.FileField(upload_to="rnd_workshop/%Y/%m/", blank=True, null=True)
    link = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="workshop_items"
    )

    def __str__(self):
        return self.title
