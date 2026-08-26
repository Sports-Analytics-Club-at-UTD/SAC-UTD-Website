from django.db import transaction
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Role
from .models import Event, EventRegistration
from .serializers import EventSerializer


class IsEventsDirectorOrReadOnly(permissions.BasePermission):
    """
    Read access is open to any authenticated member. Creating/editing/
    deleting an Event is director-only. Registering/unregistering is a
    member action and must stay open to anyone — it does NOT go through
    this permission class (see EventViewSet.get_permissions below);
    without that split, the has_permission check below would treat POST
    /events/<id>/register/ the same as POST /events/ (event creation)
    and block every member from registering for anything.
    """

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

    def get_permissions(self):
        # register/unregister are member actions — any authenticated,
        # approved user should be able to hit them. Only the CRUD actions
        # (create/update/destroy) need the director-only gate.
        if self.action in ("register", "unregister"):
            return [permissions.IsAuthenticated()]
        return [permission() for permission in self.permission_classes]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def register(self, request, pk=None):
        # get_object() first so DRF still runs the normal permission/lookup
        # checks (404 vs 403) before we touch locking.
        event = self.get_object()

        # The read-then-write here (check is_full, then create a
        # registration) is a classic TOCTOU race: without locking, two
        # concurrent requests can both read is_full=False before either
        # has written its registration, and both succeed — overselling
        # capacity. select_for_update() inside an atomic block makes the
        # whole check-and-create sequence a single atomic unit: the first
        # transaction to reach this event row holds the lock until it
        # commits, so a second concurrent request is forced to wait and
        # then re-reads the now-updated registration count.
        with transaction.atomic():
            event = Event.objects.select_for_update().get(pk=event.pk)

            # Check "already registered" BEFORE checking capacity. If this
            # check ran second, a user who already holds the last seat
            # would see event.is_full=True on their own repeat request
            # (because their own registration is what made it full) and
            # get an incorrect "Event is at capacity" instead of the
            # idempotent "Already registered." response.
            already_registered = EventRegistration.objects.filter(
                event=event, member=request.user
            ).exists()
            if already_registered:
                return Response({"detail": "Already registered."}, status=200)

            if event.is_full:
                return Response({"detail": "Event is at capacity."}, status=400)

            EventRegistration.objects.create(event=event, member=request.user)
            return Response({"detail": "Registered."}, status=201)

    @action(detail=True, methods=["post"])
    def unregister(self, request, pk=None):
        event = self.get_object()
        EventRegistration.objects.filter(event=event, member=request.user).delete()
        return Response({"detail": "Unregistered."}, status=200)