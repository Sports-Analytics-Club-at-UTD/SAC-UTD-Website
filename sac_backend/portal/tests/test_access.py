from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user


class PortalAccessTests(APITestCase):
    def test_member_denied_entirely(self):
        member = make_user("portal_member", role=Role.MEMBER)
        self.client.force_authenticate(user=member)
        response = self.client.get(reverse("portal:access"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_officer_denied_entirely(self):
        """
        Officers are one level below directors. They run day-to-day
        work for Marketing/R&D but should NOT get into the Director
        Portal itself — that's the exact boundary the person building
        this asked to have enforced.
        """
        officer = make_user("portal_officer", role=Role.OFFICER_MARKETING)
        self.client.force_authenticate(user=officer)
        response = self.client.get(reverse("portal:access"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        response = self.client.get(reverse("portal:access"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_finance_director_sees_only_finance_section(self):
        director = make_user("portal_findir", role=Role.DIRECTOR_FINANCE)
        self.client.force_authenticate(user=director)
        response = self.client.get(reverse("portal:access"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sections"], ["finance"])
        self.assertFalse(response.data["is_exec"])

    def test_secretary_sees_only_secretary_section(self):
        secretary = make_user("portal_sec", role=Role.DIRECTOR_SECRETARY)
        self.client.force_authenticate(user=secretary)
        response = self.client.get(reverse("portal:access"))
        self.assertEqual(response.data["sections"], ["secretary"])

    def test_exec_sees_every_section(self):
        exec_user = make_user("portal_exec", role=Role.EXEC)
        self.client.force_authenticate(user=exec_user)
        response = self.client.get(reverse("portal:access"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertCountEqual(
            response.data["sections"],
            ["secretary", "events", "marketing", "finance", "rnd", "exec"],
        )
        self.assertTrue(response.data["is_exec"])

    def test_superuser_sees_every_section(self):
        """
        A Django superuser (e.g. created via createsuperuser for local
        admin access) should have full portal access even though
        is_superuser and role=exec are two independent fields — the
        accessible_sections() logic checks both.
        """
        admin = make_user("portal_admin", role=Role.MEMBER, is_superuser=True)
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse("portal:access"))
        self.assertCountEqual(
            response.data["sections"],
            ["secretary", "events", "marketing", "finance", "rnd", "exec"],
        )
