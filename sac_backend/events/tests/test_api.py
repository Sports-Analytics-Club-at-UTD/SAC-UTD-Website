import datetime

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import as_list, make_user
from events.models import Event, EventRegistration


class EventCreationPermissionTests(APITestCase):
    def setUp(self):
        self.events_director = make_user("evdir", role=Role.DIRECTOR_EVENTS)
        self.member = make_user("member1", role=Role.MEMBER)
        self.payload = {
            "name": "Fantasy Draft Night",
            "date": "2026-09-15",
            "start_time": "18:00:00",
            "location": "Room 204",
        }

    def test_events_director_can_create_event(self):
        self.client.force_authenticate(user=self.events_director)
        response = self.client.post(reverse("events:event-list"), self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)
        self.assertEqual(Event.objects.first().created_by, self.events_director)

    def test_plain_member_cannot_create_event(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(reverse("events:event-list"), self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Event.objects.count(), 0)

    def test_any_director_can_submit_event_request_with_full_metadata(self):
        finance_dir = make_user("findir_ev", role=Role.DIRECTOR_FINANCE)
        self.client.force_authenticate(user=finance_dir)
        response = self.client.post(
            "/api/events/request/",
            {
                "name": "Spring Sports Analytics Expo",
                "classification": "speaker_event",
                "date": "2026-04-10",
                "start_time": "18:00:00",
                "end_time": "20:00:00",
                "room_number": "JSOM 1.118",
                "reservation_id": "RES-2026-4410",
                "event_lead": "Maya Patel",
                "event_lead_email": "maya.patel@utdallas.edu",
                "estimated_attendance": 95,
                "description": "Annual speaker night and project expo.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["room_number"], "JSOM 1.118")
        self.assertEqual(response.data["location"], "JSOM 1.118")
        self.assertEqual(response.data["reservation_id"], "RES-2026-4410")
        self.assertEqual(response.data["event_lead"], "Maya Patel")
        self.assertEqual(response.data["estimated_attendance"], 95)

        self.client.force_authenticate(user=self.member)
        member_resp = self.client.post("/api/events/request/", self.payload, format="json")
        self.assertEqual(member_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_any_authenticated_member_can_list_events(self):
        Event.objects.create(
            name="Trivia Night", date="2026-09-01", start_time="19:00:00", created_by=self.events_director
        )
        self.client.force_authenticate(user=self.member)
        response = self.client.get(reverse("events:event-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(as_list(response.data)), 1)


class EventRegistrationTests(APITestCase):
    def setUp(self):
        self.director = make_user("evdir2", role=Role.DIRECTOR_EVENTS)
        self.member = make_user("regmember", role=Role.MEMBER)
        self.event = Event.objects.create(
            name="Case Comp",
            date="2026-10-01",
            start_time="17:00:00",
            created_by=self.director,
            capacity=1,
        )

    def test_member_can_register(self):
        self.client.force_authenticate(user=self.member)
        url = reverse("events:event-register", args=[self.event.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(EventRegistration.objects.filter(event=self.event, member=self.member).exists())

    def test_double_registration_is_idempotent_not_duplicated(self):
        self.client.force_authenticate(user=self.member)
        url = reverse("events:event-register", args=[self.event.id])
        self.client.post(url)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(EventRegistration.objects.filter(event=self.event, member=self.member).count(), 1)

    def test_registration_blocked_when_event_full(self):
        self.client.force_authenticate(user=self.member)
        self.client.post(reverse("events:event-register", args=[self.event.id]))  # fills capacity=1

        other_member = make_user("othermember", role=Role.MEMBER)
        self.client.force_authenticate(user=other_member)
        response = self.client.post(reverse("events:event-register", args=[self.event.id]))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_unregister(self):
        self.client.force_authenticate(user=self.member)
        self.client.post(reverse("events:event-register", args=[self.event.id]))
        response = self.client.post(reverse("events:event-unregister", args=[self.event.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(EventRegistration.objects.filter(event=self.event, member=self.member).exists())
