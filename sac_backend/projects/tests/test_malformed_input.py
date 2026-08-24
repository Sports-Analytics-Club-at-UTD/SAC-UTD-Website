from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from projects.models import Project


class TaskMalformedInputTests(APITestCase):
    def setUp(self):
        self.member = make_user("mal_taskuser", role=Role.MEMBER)
        self.client.force_authenticate(user=self.member)
        self.project = Project.objects.create(name="Malformed Input Test Board")
        self.url = reverse("projects:task-list")

    def test_missing_title_rejected(self):
        response = self.client.post(
            self.url, {"project": self.project.id, "column": "todo"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_invalid_column_choice_rejected(self):
        response = self.client.post(
            self.url,
            {"project": self.project.id, "title": "Bad column", "column": "not_a_real_column"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("column", response.data)

    def test_nonexistent_project_id_rejected(self):
        response = self.client.post(
            self.url, {"project": 999999, "title": "Orphan task"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("project", response.data)


class ProjectMalformedInputTests(APITestCase):
    def setUp(self):
        self.director = make_user("mal_projdir", role=Role.DIRECTOR_RND)
        self.client.force_authenticate(user=self.director)

    def test_missing_name_rejected(self):
        response = self.client.post(reverse("projects:project-list"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_duplicate_name_rejected(self):
        Project.objects.create(name="Duplicate Me")
        response = self.client.post(
            reverse("projects:project-list"), {"name": "Duplicate Me"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
