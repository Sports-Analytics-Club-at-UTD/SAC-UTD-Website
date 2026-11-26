from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from events.models import Event
from .models import (
    BudgetCategory,
    BudgetEntry,
    FundingRequest,
    FundingRequestItem,
    FundingRequestModificationLog,
    RefundRequest,
)


class BudgetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCategory
        fields = ["id", "name"]


class BudgetEntrySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = BudgetEntry
        fields = [
            "id",
            "category",
            "category_name",
            "entry_type",
            "amount",
            "description",
            "date",
            "recorded_by",
            "related_event",
            "stripe_payment_id",
            "created_at",
        ]
        read_only_fields = ["recorded_by"]


class FundingRequestItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = FundingRequestItem
        fields = [
            "id",
            "item_name",
            "vendor",
            "quantity",
            "unit_quantity",
            "unit_price",
            "category",
            "item_url",
            "sort_order",
            "line_total",
        ]

    def validate_quantity(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

    def validate_unit_price(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value


class FundingRequestModificationLogSerializer(serializers.ModelSerializer):
    modified_by_username = serializers.CharField(
        source="modified_by.username", read_only=True, default=None
    )

    class Meta:
        model = FundingRequestModificationLog
        fields = [
            "id",
            "modified_by",
            "modified_by_username",
            "summary",
            "diff",
            "created_at",
        ]


class FundingRequestSerializer(serializers.ModelSerializer):
    items = FundingRequestItemSerializer(many=True)
    modification_logs = FundingRequestModificationLogSerializer(
        many=True, read_only=True
    )
    event_id = serializers.PrimaryKeyRelatedField(
        source="event",
        queryset=Event.objects.all(),
        required=False,
        allow_null=True,
    )
    event_summary = serializers.SerializerMethodField()
    requester_username = serializers.CharField(
        source="requester.username", read_only=True
    )
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True, default=None
    )
    subtotal_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    tax_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    total_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = FundingRequest
        fields = [
            "id",
            "requester",
            "requester_username",
            "requester_email",
            "title",
            "scope",
            "event_id",
            "event_summary",
            "event_classification",
            "event_name",
            "event_description",
            "event_date",
            "event_start_time",
            "event_end_time",
            "event_lead",
            "event_lead_email",
            "event_estimated_attendance",
            "room_number",
            "reservation_id",
            "notes",
            "status",
            "funding_source",
            "utd_form_required",
            "utd_form_completed",
            "utd_form_completed_at",
            "approval_id",
            "denial_reason",
            "reviewed_by",
            "reviewed_by_username",
            "reviewed_at",
            "confirmed_at",
            "include_tax",
            "tax_rate",
            "subtotal_amount",
            "tax_amount",
            "total_amount",
            "items",
            "modification_logs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "requester",
            "status",
            "funding_source",
            "utd_form_required",
            "utd_form_completed",
            "utd_form_completed_at",
            "approval_id",
            "denial_reason",
            "reviewed_by",
            "reviewed_at",
            "confirmed_at",
            "tax_rate",
        ]

    def get_event_summary(self, obj):
        if not obj.event_id:
            return None
        return {
            "id": obj.event.id,
            "name": obj.event.name,
            "date": obj.event.date.isoformat() if obj.event.date else None,
            "start_time": (
                obj.event.start_time.strftime("%H:%M") if obj.event.start_time else None
            ),
            "location": obj.event.location,
        }

    def validate(self, attrs):
        items = attrs.get("items")
        if items is not None and len(items) == 0:
            raise serializers.ValidationError(
                {"items": "At least one line item is required."}
            )

        scope = attrs.get("scope")
        if scope == FundingRequest.Scope.SPECIFIC_EVENT:
            errors = {}
            if not attrs.get("event_classification"):
                errors["event_classification"] = (
                    "Event classification is required for Specific Event requests."
                )
            if not (attrs.get("room_number") or "").strip():
                errors["room_number"] = (
                    "Room number is required for Specific Event requests."
                )
            if not (attrs.get("reservation_id") or "").strip():
                errors["reservation_id"] = (
                    "Reservation ID is required for Specific Event requests."
                )
            if errors:
                raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        with transaction.atomic():
            funding_request = FundingRequest.objects.create(**validated_data)
            for idx, item in enumerate(items_data):
                item_data = dict(item)
                item_data.setdefault("sort_order", idx)
                FundingRequestItem.objects.create(
                    funding_request=funding_request, **item_data
                )
        return funding_request


class FundingApproveSerializer(serializers.Serializer):
    funding_source = serializers.ChoiceField(
        choices=FundingRequest.FundingSource.choices, required=True
    )


class FundingModifySerializer(serializers.Serializer):
    funding_source = serializers.ChoiceField(
        choices=FundingRequest.FundingSource.choices, required=True
    )
    summary = serializers.CharField(required=False, allow_blank=True, default="")
    items = FundingRequestItemSerializer(many=True, required=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one line item is required.")
        return value


class FundingDenySerializer(serializers.Serializer):
    denial_reason = serializers.CharField(required=True, allow_blank=False)

    def validate_denial_reason(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Written denial reasoning is required.")
        return cleaned


class UtdFormUpdateSerializer(serializers.Serializer):
    utd_form_completed = serializers.BooleanField(required=True)


class RefundRequestSerializer(serializers.ModelSerializer):
    requester_username = serializers.CharField(
        source="requester.username", read_only=True
    )
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True, default=None
    )
    funding_request_summary = serializers.SerializerMethodField()

    class Meta:
        model = RefundRequest
        fields = [
            "id",
            "funding_request",
            "funding_request_summary",
            "approval_id_entered",
            "requester",
            "requester_username",
            "amount_claimed",
            "receipt_original_filename",
            "receipt_content_type",
            "comments",
            "status",
            "reviewed_by",
            "reviewed_by_username",
            "reviewed_at",
            "director_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_funding_request_summary(self, obj):
        fr = obj.funding_request
        return {
            "id": fr.id,
            "title": fr.title,
            "approval_id": fr.approval_id,
            "scope": fr.scope,
            "event_classification": fr.event_classification,
            "event_name": fr.event.name if fr.event_id else None,
            "funding_source": fr.funding_source,
            "total_amount": str(fr.total_amount),
            "items": FundingRequestItemSerializer(fr.items.all(), many=True).data,
        }


class RefundStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RefundRequest.Status.choices, required=True)
    director_notes = serializers.CharField(required=False, allow_blank=True, default="")
