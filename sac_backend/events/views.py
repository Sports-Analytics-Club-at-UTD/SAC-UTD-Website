from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Role
from .models import Event, EventRegistration
from .serializers import EventSerializer


class IsEventsDirectorOrReadOnly(permissions.BasePermission):
    """Anyone approved can view/register; only Events Director (or Exec) can create/edit."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user.is_authenticated
            and (user.is_superuser or user.role in (Role.DIRECTOR_EVENTS, Role.EXEC))
        )


class EventViewSet(viewsets.ModelViewSet):
    """
    /api/events/                 GET (calendar list), POST (Events Director creates)
    /api/events/<id>/            GET, PATCH, DELETE
    /api/events/<id>/register/   POST  -> register the logged-in member
    /api/events/<id>/unregister/ POST  -> cancel their registration
    """

    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsEventsDirectorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def register(self, request, pk=None):
        event = self.get_object()
        if event.is_full:
            return Response({"detail": "Event is at capacity."}, status=400)
        _, created = EventRegistration.objects.get_or_create(event=event, member=request.user)
        if not created:
            return Response({"detail": "Already registered."}, status=200)
        return Response({"detail": "Registered."}, status=201)

    @action(detail=True, methods=["post"])
    def unregister(self, request, pk=None):
        event = self.get_object()
        EventRegistration.objects.filter(event=event, member=request.user).delete()
        return Response({"detail": "Unregistered."}, status=200)
