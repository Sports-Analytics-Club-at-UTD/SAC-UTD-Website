from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from accounts.models import Role
from .models import Project, Task
from .serializers import ProjectDetailSerializer, ProjectListSerializer, TaskSerializer


class IsProjectManagerOrReadOnly(permissions.BasePermission):
    """
    Any approved member can view boards (they need to see what teams are
    doing / who's on them). Only a Director or Exec can create/edit/delete
    a Project itself — day-to-day task management is handled by TaskViewSet,
    which stays open to any authenticated member so team leads who aren't
    directors can still run their own board.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(user.is_authenticated and (user.is_superuser or user.is_director))


class ProjectViewSet(viewsets.ModelViewSet):
    """
    /api/projects/?search=<name>&status=active   filter by name / status
    /api/projects/<id>/                           full board: members + tasks
    """

    queryset = Project.objects.all().prefetch_related("members", "tasks")
    permission_classes = [permissions.IsAuthenticated, IsProjectManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status"]
    search_fields = ["name"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        return ProjectDetailSerializer


class TaskViewSet(viewsets.ModelViewSet):
    """
    /api/projects/tasks/?project=<id>&column=todo
    Kanban card CRUD — drag-and-drop reordering just PATCHes `column` + `order`.
    """

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["project", "column", "assigned_to"]