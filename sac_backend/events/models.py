from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Event(TimeStampedModel):
    """
    A single club event on the calendar. Created by the Events Director
    from the Events Page. Name/Date/Time/Register button, per spec.
    """

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="events_created"
    )

    registered_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="EventRegistration",
        related_name="registered_events",
        blank=True,
    )

    capacity = models.PositiveIntegerField(
        null=True, blank=True, help_text="Leave blank for unlimited"
    )

    class Meta(TimeStampedModel.Meta):
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"{self.name} ({self.date})"

    @property
    def registration_count(self):
        return self.registrations.count()

    @property
    def is_full(self):
        return bool(self.capacity) and self.registration_count >= self.capacity


class EventRegistration(TimeStampedModel):
    """Through-model for the Register button on the Events Page."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_registrations")

    class Meta(TimeStampedModel.Meta):
        unique_together = ("event", "member")

    def __str__(self):
        return f"{self.member} -> {self.event}"
