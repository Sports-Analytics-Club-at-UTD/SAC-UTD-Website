from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import as_list, make_user
from requests_hub.models import Request


class RequestVisibilityTests(APITestCase):
    def setUp(self):
        self.finance_dir = make_user("fin_dir3", role=Role.DIRECTOR_FINANCE)
        self.marketing_dir = make_user("mkt_dir3", role=Role.DIRECTOR_MARKETING)
        self.exec_user = make_user("exec_user2", role=Role.EXEC)

    def test_director_can_file_a_request(self):
        self.client.force_authenticate(user=self.finance_dir)
        payload = {"title": "Need Stripe payout approved", "category": "budget"}
        response = self.client.post(reverse("requests_hub:request-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Request.objects.first().submitted_by, self.finance_dir)

    def test_director_only_sees_own_requests(self):
        Request.objects.create(title="Finance's request", submitted_by=self.finance_dir)
        Request.objects.create(title="Marketing's request", submitted_by=self.marketing_dir)

        self.client.force_authenticate(user=self.finance_dir)
        response = self.client.get(reverse("requests_hub:request-list"))
        titles = [r["title"] for r in as_list(response.data)]
        self.assertEqual(titles, ["Finance's request"])

    def test_exec_sees_all_requests(self):
        Request.objects.create(title="Finance's request", submitted_by=self.finance_dir)
        Request.objects.create(title="Marketing's request", submitted_by=self.marketing_dir)

        self.client.force_authenticate(user=self.exec_user)
        response = self.client.get(reverse("requests_hub:request-list"))
        self.assertEqual(len(as_list(response.data)), 2)

    def test_exec_can_resolve_a_request(self):
        req = Request.objects.create(title="Fix homepage bug", submitted_by=self.marketing_dir, category="site_bug")
        self.client.force_authenticate(user=self.exec_user)

        url = reverse("requests_hub:request-resolve", args=[req.id])
        response = self.client.post(url, {"status": "resolved", "resolution_note": "Deployed fix."}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, Request.Status.RESOLVED)
        self.assertEqual(req.resolved_by, self.exec_user)

    def test_non_exec_cannot_resolve_a_request(self):
        req = Request.objects.create(title="Fix homepage bug", submitted_by=self.marketing_dir)
        self.client.force_authenticate(user=self.finance_dir)

        url = reverse("requests_hub:request-resolve", args=[req.id])
        response = self.client.post(url, {"status": "resolved"}, format="json")

        # NOT 403. get_queryset() filters non-Exec users to only their
        # own requests, so get_object() 404s on someone else's request
        # before the "Exec only" check inside resolve() is ever reached.
        # This is intentional: a non-Exec director shouldn't be able to
        # confirm another director's request even exists, let alone get
        # a specific "you're not allowed to touch this" response about it.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)