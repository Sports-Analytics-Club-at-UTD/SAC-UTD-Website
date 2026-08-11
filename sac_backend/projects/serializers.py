from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.serializers import MemberProfileSerializer
from .models import Project, Task

User = get_user_model()


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "project", "title", "description", "column",
            "assigned_to", "due_date", "order", "created_at", "updated_at",
        ]


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight version for the board-picker / filter-by-name list."""

    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "name", "status", "lead", "member_count"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    """Full board view: members list + tasks grouped implicitly by column."""

    members = MemberProfileSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        source="members", many=True, write_only=True, required=False, queryset=User.objects.all()
    )
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "status", "lead",
            "members", "member_ids", "tasks", "created_at", "updated_at",
        ]