from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import as_list, make_user
from projects.models import Project, Task


class ProjectPermissionTests(APITestCase):
    def setUp(self):
        self.director = make_user("rnd_dir", role=Role.DIRECTOR_RND)
        self.member = make_user("teammate", role=Role.MEMBER)

    def test_director_can_create_project(self):
        self.client.force_authenticate(user=self.director)
        response = self.client.post(
            reverse("projects:project-list"), {"name": "xG Model v2"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 1)

    def test_plain_member_cannot_create_project(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(
            reverse("projects:project-list"), {"name": "Unauthorized Project"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Project.objects.count(), 0)

    def test_member_can_still_view_projects(self):
        Project.objects.create(name="Public Board")
        self.client.force_authenticate(user=self.member)
        response = self.client.get(reverse("projects:project-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ProjectFilterAndDetailTests(APITestCase):
    def setUp(self):
        self.director = make_user("mkt_dir", role=Role.DIRECTOR_MARKETING)
        self.alice = make_user("alice", role=Role.MEMBER)
        self.bob = make_user("bob", role=Role.MEMBER)

        self.football_project = Project.objects.create(name="Football Win Probability", lead=self.director)
        self.football_project.members.add(self.alice, self.bob)

        self.hoops_project = Project.objects.create(name="Basketball Shot Chart")

    def test_search_filters_by_name(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.get(reverse("projects:project-list"), {"search": "Football"})
        names = [p["name"] for p in as_list(response.data)]
        self.assertIn("Football Win Probability", names)
        self.assertNotIn("Basketball Shot Chart", names)

    def test_detail_view_includes_member_roster_and_tasks(self):
        Task.objects.create(project=self.football_project, title="Clean 2025 play-by-play data")
        self.client.force_authenticate(user=self.alice)
        response = self.client.get(reverse("projects:project-detail", args=[self.football_project.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        member_usernames = [m["username"] for m in response.data["members"]]
        self.assertIn("alice", member_usernames)
        self.assertIn("bob", member_usernames)
        self.assertEqual(len(response.data["tasks"]), 1)


class TaskKanbanTests(APITestCase):
    def setUp(self):
        self.member = make_user("kanbanuser", role=Role.MEMBER)
        self.project = Project.objects.create(name="Recruiting Site Revamp")

    def test_member_can_create_task(self):
        self.client.force_authenticate(user=self.member)
        payload = {"project": self.project.id, "title": "Design new landing page", "column": "todo"}
        response = self.client.post(reverse("projects:task-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_filter_tasks_by_column(self):
        Task.objects.create(project=self.project, title="A", column=Task.Column.TODO)
        Task.objects.create(project=self.project, title="B", column=Task.Column.DONE)

        self.client.force_authenticate(user=self.member)
        response = self.client.get(reverse("projects:task-list"), {"column": "done"})
        results = as_list(response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "B")

    def test_moving_task_between_columns(self):
        task = Task.objects.create(project=self.project, title="Drag me", column=Task.Column.TODO)
        self.client.force_authenticate(user=self.member)
        url = reverse("projects:task-detail", args=[task.id])
        response = self.client.patch(url, {"column": "in_progress"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.column, Task.Column.IN_PROGRESS)
