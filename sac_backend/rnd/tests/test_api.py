from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from rnd.models import Idea


class RndAccessTests(APITestCase):
    def setUp(self):
        self.rnd_director = make_user("rnd_dir3", role=Role.DIRECTOR_RND)
        self.rnd_officer = make_user("rnd_officer1", role=Role.OFFICER_RND)
        self.exec_user = make_user("exec_user1", role=Role.EXEC)
        self.outsider = make_user("marketing_person", role=Role.DIRECTOR_MARKETING)

    def test_rnd_director_can_create_idea(self):
        self.client.force_authenticate(user=self.rnd_director)
        response = self.client.post(reverse("rnd:idea-list"), {"title": "Player tracking model"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_rnd_officer_can_create_idea(self):
        self.client.force_authenticate(user=self.rnd_officer)
        response = self.client.post(reverse("rnd:idea-list"), {"title": "Injury prediction tool"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_exec_can_view_rnd_ideas(self):
        Idea.objects.create(title="Exec-visible idea", submitted_by=self.rnd_director)
        self.client.force_authenticate(user=self.exec_user)
        response = self.client.get(reverse("rnd:idea-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_rnd_role_is_locked_out_entirely(self):
        self.client.force_authenticate(user=self.outsider)
        response = self.client.get(reverse("rnd:idea-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_workshop_items_also_locked_to_rnd_team(self):
        self.client.force_authenticate(user=self.outsider)
        response = self.client.get(reverse("rnd:workshop-item-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
