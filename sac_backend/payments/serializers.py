from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """Read-only view of a payment — for a user's own history, or Finance's full list."""

    purpose_display = serializers.CharField(source="get_purpose_display", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = Payment
        fields = [
            "id", "purpose", "purpose_display", "status", "amount", "currency",
            "related_event", "username", "created_at",
        ]


class CreateCheckoutSessionSerializer(serializers.Serializer):
    """
    Input validation for starting a payment. Deliberately NOT a
    ModelSerializer against Payment — `amount` here is only ever
    trusted as real user input for a DONATION. For event_registration
    and membership_dues, the actual charge amount is looked up
    server-side (Event.price / settings.MEMBERSHIP_DUES_AMOUNT) in the
    view, and any amount the client sends for those purposes is
    silently ignored — never trust a client-supplied price for
    anything with a fixed cost.
    """

    purpose = serializers.ChoiceField(choices=Payment.Purpose.choices)
    event_id = serializers.IntegerField(required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, min_value=1)

    def validate(self, attrs):
        purpose = attrs["purpose"]
        if purpose == Payment.Purpose.EVENT_REGISTRATION and not attrs.get("event_id"):
            raise serializers.ValidationError({"event_id": "Required for event_registration."})
        if purpose == Payment.Purpose.DONATION and not attrs.get("amount"):
            raise serializers.ValidationError({"amount": "Required for donation."})
        return attrs