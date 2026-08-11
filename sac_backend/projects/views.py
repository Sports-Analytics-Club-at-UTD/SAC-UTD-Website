from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets

from .models import Project, Task
from .serializers import ProjectDetailSerializer, ProjectListSerializer, TaskSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    """
    /api/projects/?search=<name>&status=active   filter by name / status
    /api/projects/<id>/                           full board: members + tasks
    """

    queryset = Project.objects.all().prefetch_related("members", "tasks")
    permission_classes = [permissions.IsAuthenticated]
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
