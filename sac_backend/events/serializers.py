from rest_framework import serializers

from .models import Event, EventRegistration


class EventSerializer(serializers.ModelSerializer):
    registration_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    is_registered = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "name", "description", "date", "start_time", "end_time",
            "location", "capacity", "registration_count", "is_full",
            "is_registered", "created_by", "created_at",
        ]
        read_only_fields = ["created_by"]

    def get_is_registered(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.registrations.filter(member=request.user).exists()


class EventRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventRegistration
        fields = ["id", "event", "member", "created_at"]
        read_only_fields = ["member"]
