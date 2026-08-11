from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from events.models import Event


class EventMalformedInputTests(APITestCase):
    def setUp(self):
        self.director = make_user("mal_evdir", role=Role.DIRECTOR_EVENTS)
        self.client.force_authenticate(user=self.director)
        self.url = reverse("events:event-list")

    def test_missing_required_date_rejected(self):
        response = self.client.post(
            self.url, {"name": "No Date Event", "start_time": "10:00:00"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date", response.data)

    def test_malformed_date_format_rejected(self):
        response = self.client.post(
            self.url,
            {"name": "Bad Date", "date": "not-a-date", "start_time": "10:00:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_time_format_rejected(self):
        response = self.client.post(
            self.url,
            {"name": "Bad Time", "date": "2026-09-01", "start_time": "6pm"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_capacity_rejected(self):
        response = self.client.post(
            self.url,
            {
                "name": "Negative Capacity",
                "date": "2026-09-01",
                "start_time": "10:00:00",
                "capacity": -5,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", response.data)

    def test_register_on_nonexistent_event_returns_404_not_500(self):
        member = make_user("mal_member", role=Role.MEMBER)
        self.client.force_authenticate(user=member)
        url = reverse("events:event-register", args=[999999])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
