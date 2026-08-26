from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class SignupSerializer(serializers.ModelSerializer):
    """Used by the public Sign Up Page. New users start unapproved with role=member."""

    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password",
            "first_name", "last_name",
            "grade", "major", "interests", "favorite_sport", "favorite_team",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.is_approved = False
        user.save()
        return user


class MemberProfileSerializer(serializers.ModelSerializer):
    """
    Used by the Member Page — a user viewing/editing their own info,
    or a director viewing someone else's (read-only in that case, enforced
    by IsSelfOrDirectorReadOnly at the view level).
    """

    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "role_display", "is_approved",
            "grade", "major", "interests", "favorite_sport", "favorite_team", "bio",
        ]
        read_only_fields = ["id", "username", "role", "is_approved"]


class SecretaryUserSerializer(serializers.ModelSerializer):
    """
    Used on the Secretary Page: full visibility + the two fields the
    Secretary is actually allowed to change (role, is_approved).
    """

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "is_approved", "date_joined",
        ]
        read_only_fields = ["id", "username", "email", "first_name", "last_name", "date_joined"]
