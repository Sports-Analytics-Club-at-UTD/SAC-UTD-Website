from rest_framework import serializers

from .models import MediaUpload


MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # Supabase free-tier per-file limit


class MediaUploadSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)

    class Meta:
        model = MediaUpload
        fields = [
            "id", "title", "file", "gdrive_file_id", "gdrive_url",
            "uploaded_by", "uploaded_by_username", "status", "reviewed_by", "review_note",
            "display_order", "created_at",
        ]
        read_only_fields = ["uploaded_by", "status", "reviewed_by"]

    def validate_file(self, file):
        # Files are served publicly from the bucket, so only accept images/videos.
        if file and not (file.content_type or "").startswith(("image/", "video/")):
            raise serializers.ValidationError("Only image or video files can be uploaded.")
        if file and file.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("File is larger than 50 MB.")
        return file


class MediaReviewSerializer(serializers.ModelSerializer):
    """Marketing Director-only: approve/reject an upload."""

    class Meta:
        model = MediaUpload
        fields = ["status", "review_note", "display_order"]
