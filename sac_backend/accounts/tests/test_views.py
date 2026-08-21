from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role, User
from core.test_utils import as_list, make_user


class SignupTests(APITestCase):
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_signup_creates_unapproved_member_and_notifies_secretary(self):
        url = reverse("accounts:signup")
        payload = {
            "username": "newmember",
            "email": "newmember@sac.test",
            "password": "S3curePass!23",
            "first_name": "New",
            "last_name": "Member",
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="newmember")
        self.assertFalse(user.is_approved)
        self.assertEqual(user.role, Role.MEMBER)

        # signup should hand back a token immediately (see accounts/views.py)
        self.assertIn("token", response.data)

        # the post_save signal should have fired an email to the secretary
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("newmember", mail.outbox[0].body)

    def test_signup_rejects_weak_password(self):
        url = reverse("accounts:signup")
        payload = {"username": "weak", "email": "weak@sac.test", "password": "123"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="weak").exists())

    def test_duplicate_username_rejected(self):
        make_user("taken")
        url = reverse("accounts:signup")
        payload = {"username": "taken", "email": "taken2@sac.test", "password": "S3curePass!23"}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WhoAmITests(APITestCase):
    def test_whoami_reflects_role_flags(self):
        director = make_user("evdir", role=Role.DIRECTOR_EVENTS)
        self.client.force_authenticate(user=director)

        response = self.client.get(reverse("accounts:whoami"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], Role.DIRECTOR_EVENTS)
        self.assertTrue(response.data["is_director"])
        self.assertFalse(response.data["is_officer"])

    def test_whoami_requires_authentication(self):
        response = self.client.get(reverse("accounts:whoami"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SecretaryApprovalWorkflowTests(APITestCase):
    """
    This is the workflow the club actually depends on: a member signs
    up unapproved, and ONLY the Secretary (or Exec) can see the pending
    queue and grant a role / approval. Every other role must be locked out.
    """

    def setUp(self):
        self.secretary = make_user("secretary1", role=Role.DIRECTOR_SECRETARY)
        self.pending_member = make_user("pending1", role=Role.MEMBER, is_approved=False)
        self.random_officer = make_user("mktofficer", role=Role.OFFICER_MARKETING)

    def test_secretary_can_view_pending_members(self):
        self.client.force_authenticate(user=self.secretary)
        response = self.client.get(reverse("accounts:pending-members"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u["username"] for u in as_list(response.data)]
        self.assertIn("pending1", usernames)

    def test_non_secretary_cannot_view_pending_members(self):
        self.client.force_authenticate(user=self.random_officer)
        response = self.client.get(reverse("accounts:pending-members"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_secretary_can_approve_and_assign_role(self):
        self.client.force_authenticate(user=self.secretary)
        url = reverse("accounts:member-role-update", args=[self.pending_member.id])
        response = self.client.patch(
            url, {"role": Role.OFFICER_RND, "is_approved": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.pending_member.refresh_from_db()
        self.assertTrue(self.pending_member.is_approved)
        self.assertEqual(self.pending_member.role, Role.OFFICER_RND)

    def test_member_cannot_self_approve(self):
        self.client.force_authenticate(user=self.pending_member)
        url = reverse("accounts:member-role-update", args=[self.pending_member.id])
        response = self.client.patch(url, {"is_approved": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.pending_member.refresh_from_db()
        self.assertFalse(self.pending_member.is_approved)

    def test_exec_can_also_manage_roles(self):
        exec_user = make_user("exec_person", role=Role.EXEC)
        self.client.force_authenticate(user=exec_user)
        url = reverse("accounts:member-role-update", args=[self.pending_member.id])
        response = self.client.patch(url, {"is_approved": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
