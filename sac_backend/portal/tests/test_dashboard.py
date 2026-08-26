from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from events.models import Event
from finance.models import BudgetCategory, BudgetEntry
from media_hub.models import MediaUpload


class PortalDashboardTests(APITestCase):
    def test_member_denied(self):
        member = make_user("dash_member", role=Role.MEMBER)
        self.client.force_authenticate(user=member)
        response = self.client.get(reverse("portal:dashboard"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_finance_director_only_sees_finance_key(self):
        director = make_user("dash_findir", role=Role.DIRECTOR_FINANCE)
        category = BudgetCategory.objects.create(name="Events")
        BudgetEntry.objects.create(
            category=category, entry_type="income", amount=Decimal("100.00"),
            date="2026-08-01", recorded_by=director,
        )

        self.client.force_authenticate(user=director)
        response = self.client.get(reverse("portal:dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("finance", response.data)
        self.assertNotIn("secretary", response.data)
        self.assertNotIn("events", response.data)
        self.assertEqual(response.data["finance"]["balance"], Decimal("100.00"))

    def test_secretary_dashboard_counts_pending_members(self):
        secretary = make_user("dash_sec", role=Role.DIRECTOR_SECRETARY)
        make_user("waiting1", role=Role.MEMBER, is_approved=False)
        make_user("waiting2", role=Role.MEMBER, is_approved=False)
        make_user("already_in", role=Role.MEMBER, is_approved=True)

        self.client.force_authenticate(user=secretary)
        response = self.client.get(reverse("portal:dashboard"))

        self.assertEqual(response.data["secretary"]["pending_members"], 2)

    def test_marketing_dashboard_counts_pending_media(self):
        marketing_dir = make_user("dash_mkt", role=Role.DIRECTOR_MARKETING)
        officer = make_user("dash_officer", role=Role.OFFICER_MARKETING)
        MediaUpload.objects.create(title="Pending 1", uploaded_by=officer, status=MediaUpload.Status.PENDING)
        MediaUpload.objects.create(title="Already approved", uploaded_by=officer, status=MediaUpload.Status.APPROVED)

        self.client.force_authenticate(user=marketing_dir)
        response = self.client.get(reverse("portal:dashboard"))

        self.assertEqual(response.data["marketing"]["pending_media"], 1)

    def test_events_dashboard_only_counts_future_events(self):
        events_dir = make_user("dash_ev", role=Role.DIRECTOR_EVENTS)
        Event.objects.create(name="Future", date="2099-01-01", start_time="10:00:00", created_by=events_dir)
        Event.objects.create(name="Past", date="2020-01-01", start_time="10:00:00", created_by=events_dir)

        self.client.force_authenticate(user=events_dir)
        response = self.client.get(reverse("portal:dashboard"))

        self.assertEqual(response.data["events"]["upcoming_events"], 1)

    def test_exec_dashboard_includes_every_section_key(self):
        exec_user = make_user("dash_exec", role=Role.EXEC)
        self.client.force_authenticate(user=exec_user)
        response = self.client.get(reverse("portal:dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ("secretary", "events", "marketing", "finance", "rnd", "exec"):
            self.assertIn(key, response.data)
