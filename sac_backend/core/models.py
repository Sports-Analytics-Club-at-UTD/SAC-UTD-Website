from django.db import models


class TimeStampedModel(models.Model):
    """
    Abstract base: every model in the project should inherit from this
    instead of models.Model directly, so we get created/updated tracking
    for free (useful for admin sorting, audit trails, "last updated" on
    Kanban cards, etc.).
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
