from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class MediaUpload(TimeStampedModel):
    """
    A photo/video submitted by a Marketing Officer. The Marketing
    Director approves/rejects via the "approval wheel" on the Marketing
    Page; only APPROVED items should be pulled into the homepage media
    scroller by the frontend.

    gdrive_file_id / gdrive_url are optional — fill these in once the
    GDrive API integration is wired up so uploads can live in a shared
    Drive folder instead of (or in addition to) local/S3 storage.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    title = models.CharField(max_length=200, blank=True)
    file = models.FileField(upload_to="media_uploads/%Y/%m/", blank=True, null=True)
    gdrive_file_id = models.CharField(max_length=255, blank=True)
    gdrive_url = models.URLField(blank=True)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="media_uploads"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="media_reviewed",
    )
    review_note = models.CharField(max_length=300, blank=True)

    # Controls order in the homepage media scroller once approved.
    display_order = models.PositiveIntegerField(default=0)

    class Meta(TimeStampedModel.Meta):
        pass

    def __str__(self):
        return self.title or f"Upload #{self.pk}"
