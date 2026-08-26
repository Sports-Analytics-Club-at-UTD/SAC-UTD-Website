from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role, User


class SignupMalformedInputTests(APITestCase):
    def setUp(self):
        self.url = reverse("accounts:signup")

    def test_missing_password_rejected(self):
        response = self.client.post(
            self.url, {"username": "nopass", "email": "nopass@sac.test"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.filter(username="nopass").exists())

    def test_missing_username_rejected(self):
        response = self.client.post(
            self.url, {"email": "nouser@sac.test", "password": "S3curePass!23"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_email_rejected(self):
        response = self.client.post(
            self.url,
            {"username": "bademail", "email": "not-an-email", "password": "S3curePass!23"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertFalse(User.objects.filter(username="bademail").exists())

    def test_empty_payload_rejected(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_role_field_in_payload_is_ignored_not_a_privilege_escalation(self):
        """
        SignupSerializer's fields list doesn't include `role`, so even
        if someone crafts a signup payload that tries to set
        role="exec" directly, DRF silently drops the unrecognized
        field rather than applying it. This test exists to make that
        guarantee explicit and regression-proof — if a future change
        ever adds `role` to SignupSerializer.Meta.fields without also
        adding validation, this test should start failing.
        """
        response = self.client.post(
            self.url,
            {
                "username": "wannabe_exec",
                "email": "wannabe@sac.test",
                "password": "S3curePass!23",
                "role": Role.EXEC,
                "is_approved": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="wannabe_exec")
        self.assertEqual(user.role, Role.MEMBER)
        self.assertFalse(user.is_approved)
