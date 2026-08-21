from rest_framework import serializers

from .models import Request


class RequestSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(source="submitted_by.username", read_only=True)

    class Meta:
        model = Request
        fields = [
            "id", "title", "description", "category", "status",
            "submitted_by", "submitted_by_name", "resolved_by",
            "resolution_note", "notify_exec", "created_at", "updated_at",
        ]
        read_only_fields = ["submitted_by", "resolved_by"]


class RequestResolveSerializer(serializers.ModelSerializer):
    """Exec-only: update status + leave a resolution note."""

    class Meta:
        model = Request
        fields = ["status", "resolution_note"]
