from rest_framework import serializers

from .models import Idea, IndustryConnection, RndTodo, WorkshopItem


class IdeaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Idea
        fields = ["id", "title", "description", "status", "submitted_by", "created_at"]
        read_only_fields = ["submitted_by"]


class IndustryConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndustryConnection
        fields = ["id", "org_name", "contact_name", "contact_email", "notes", "last_contacted"]


class RndTodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RndTodo
        fields = ["id", "title", "notes", "status", "assigned_to", "created_at"]


class WorkshopItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkshopItem
        fields = ["id", "title", "file", "link", "notes", "uploaded_by", "created_at"]
        read_only_fields = ["uploaded_by"]
