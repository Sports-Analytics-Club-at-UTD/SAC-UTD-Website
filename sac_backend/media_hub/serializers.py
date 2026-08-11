from rest_framework import serializers

from .models import MediaUpload


class MediaUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaUpload
        fields = [
            "id", "title", "file", "gdrive_file_id", "gdrive_url",
            "uploaded_by", "status", "reviewed_by", "review_note",
            "display_order", "created_at",
        ]
        read_only_fields = ["uploaded_by", "status", "reviewed_by"]


class MediaReviewSerializer(serializers.ModelSerializer):
    """Marketing Director-only: approve/reject an upload."""

    class Meta:
        model = MediaUpload
        fields = ["status", "review_note", "display_order"]
