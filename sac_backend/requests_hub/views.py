from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Role
from .models import Request as SacRequest
from .serializers import RequestResolveSerializer, RequestSerializer


class RequestViewSet(viewsets.ModelViewSet):
    """
    /api/requests/                GET (mine, or all if Exec), POST (file a new request)
    /api/requests/<id>/resolve/   POST -> Exec-only status update
    """

    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SacRequest.objects.all()
        if user.is_superuser or user.role == Role.EXEC:
            return qs
        return qs.filter(submitted_by=user)

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        req = self.get_object()
        user = request.user
        if not (user.is_superuser or user.role == Role.EXEC):
            return Response({"detail": "Exec only."}, status=403)
        serializer = RequestResolveSerializer(req, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(resolved_by=user)
        return Response(serializer.data)
