from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user


class DefenseInDepthTests(APITestCase):
    """
    Every permission class in this project (portal.permissions.IsDirectorPortalUser,
    events.views.IsEventsDirectorOrReadOnly, finance.views.IsFinanceDirectorOrReadOnly,
    accounts.permissions.IsSecretary, etc.) documents the same claim: the
    portal app only gates entry to the Director Portal *shell*, and every
    actual data endpoint enforces its own permission independently — so a
    bug in one layer can't silently grant access the other layer would
    still refuse.

    This file is where that claim actually gets tested, rather than just
    asserted in a docstring. The scenario throughout: a director who is
    real, approved, and has genuine access to their OWN section, but
    tries to reach a DIFFERENT director's section. Passing
    portal.access() for one section should never imply passing anything
    for another.
    """

    def setUp(self):
        self.finance_director = make_user("dd_findir", role=Role.DIRECTOR_FINANCE)
        self.events_director = make_user("dd_evdir", role=Role.DIRECTOR_EVENTS)
        self.secretary = make_user("dd_sec", role=Role.DIRECTOR_SECRETARY)

    def test_finance_director_confirmed_via_portal_access(self):
        """Sanity check the setup: Finance Director really does have finance-only portal access."""
        self.client.force_authenticate(user=self.finance_director)
        response = self.client.get(reverse("portal:access"))
        self.assertEqual(response.data["sections"], ["finance"])

    def test_finance_director_can_use_finance_endpoints(self):
        self.client.force_authenticate(user=self.finance_director)
        response = self.client.get(reverse("finance:budget-entry-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_finance_director_cannot_create_events(self):
        """
        Both are 'directors' by the portal's coarse-grained is_director
        check — that's exactly why this matters. The portal shell would
        happily let a Finance Director in the door; it's events.views'
        OWN permission class that has to be the thing stopping them here,
        completely independent of anything portal/ decided.
        """
        self.client.force_authenticate(user=self.finance_director)
        response = self.client.post(
            reverse("events:event-list"),
            {"name": "Unauthorized Event", "date": "2026-12-01", "start_time": "10:00:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_finance_director_cannot_view_secretary_pending_list(self):
        self.client.force_authenticate(user=self.finance_director)
        response = self.client.get(reverse("accounts:pending-members"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_events_director_cannot_create_budget_entries(self):
        self.client.force_authenticate(user=self.events_director)
        response = self.client.post(
            reverse("finance:budget-entry-list"),
            {"entry_type": "income", "amount": "10.00", "date": "2026-08-01"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_secretary_cannot_resolve_exec_requests(self):
        from requests_hub.models import Request

        req = Request.objects.create(title="Test", submitted_by=self.finance_director)
        self.client.force_authenticate(user=self.secretary)
        response = self.client.post(
            reverse("requests_hub:request-resolve", args=[req.id]), {"status": "resolved"}, format="json"
        )
        # 404, not 403 — see requests_hub's own test suite for why that's
        # the correct, more secure behavior (get_queryset filters
        # non-Exec users to their own requests before the resolve
        # action's exec-check is ever reached).
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_portal_access_alone_never_implies_data_access(self):
        """
        The load-bearing assertion of this whole file: successfully
        calling /api/portal/access/ and seeing your own section listed
        proves NOTHING about any other endpoint. Confirmed here by
        having the Events Director pass their own access check, then
        fail on a completely unrelated director's create endpoint.
        """
        self.client.force_authenticate(user=self.events_director)

        access_response = self.client.get(reverse("portal:access"))
        self.assertEqual(access_response.data["sections"], ["events"])

        finance_response = self.client.post(
            reverse("finance:budget-entry-list"),
            {"entry_type": "income", "amount": "10.00", "date": "2026-08-01"},
            format="json",
        )
        self.assertEqual(finance_response.status_code, status.HTTP_403_FORBIDDEN)
