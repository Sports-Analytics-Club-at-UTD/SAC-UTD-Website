from rest_framework import permissions, viewsets

from accounts.models import Role
from .models import Idea, IndustryConnection, RndTodo, WorkshopItem
from .serializers import (
    IdeaSerializer,
    IndustryConnectionSerializer,
    RndTodoSerializer,
    WorkshopItemSerializer,
)


class IsRndTeam(permissions.BasePermission):
    """R&D Director, R&D Officers, or Exec — this whole app is internal to the R&D team."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.role in (Role.DIRECTOR_RND, Role.OFFICER_RND, Role.EXEC)
            )
        )


class IdeaViewSet(viewsets.ModelViewSet):
    queryset = Idea.objects.all()
    serializer_class = IdeaSerializer
    permission_classes = [permissions.IsAuthenticated, IsRndTeam]

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)


class IndustryConnectionViewSet(viewsets.ModelViewSet):
    queryset = IndustryConnection.objects.all()
    serializer_class = IndustryConnectionSerializer
    permission_classes = [permissions.IsAuthenticated, IsRndTeam]


class RndTodoViewSet(viewsets.ModelViewSet):
    queryset = RndTodo.objects.all()
    serializer_class = RndTodoSerializer
    permission_classes = [permissions.IsAuthenticated, IsRndTeam]


class WorkshopItemViewSet(viewsets.ModelViewSet):
    """R&D Officers' internal workshop folder."""

    queryset = WorkshopItem.objects.all()
    serializer_class = WorkshopItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsRndTeam]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
