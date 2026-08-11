from rest_framework import serializers

from .models import BudgetCategory, BudgetEntry


class BudgetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCategory
        fields = ["id", "name"]


class BudgetEntrySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = BudgetEntry
        fields = [
            "id", "category", "category_name", "entry_type", "amount",
            "description", "date", "recorded_by", "related_event",
            "stripe_payment_id", "created_at",
        ]
        read_only_fields = ["recorded_by"]
