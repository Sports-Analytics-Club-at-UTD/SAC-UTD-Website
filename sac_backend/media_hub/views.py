from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Role
from .models import MediaUpload
from .serializers import MediaReviewSerializer, MediaUploadSerializer


class IsMarketingDirectorOrOwner(permissions.BasePermission):
    """Officers can create/view their own uploads; Marketing Director sees + reviews all."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        is_marketing_lead = user.is_superuser or user.role in (Role.DIRECTOR_MARKETING, Role.EXEC)
        if request.method in permissions.SAFE_METHODS:
            return is_marketing_lead or obj.uploaded_by == user
        return is_marketing_lead


class MediaUploadViewSet(viewsets.ModelViewSet):
    """
    /api/media/                 GET (mine, or all if Marketing Director), POST (officer upload)
    /api/media/approved/        GET  -> public feed for the homepage media scroller
    /api/media/<id>/review/     POST -> Marketing Director approves/rejects
    """

    serializer_class = MediaUploadSerializer
    permission_classes = [permissions.IsAuthenticated, IsMarketingDirectorOrOwner]

    def get_queryset(self):
        user = self.request.user
        qs = MediaUpload.objects.all()
        
        # If requested, filter by status (e.g. /api/media/uploads/?status=Pending Review)
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        if user.is_superuser or user.role in (Role.DIRECTOR_MARKETING, Role.EXEC):
            return qs
        return qs.filter(uploaded_by=user)
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def approved(self, request):
        qs = MediaUpload.objects.filter(status=MediaUpload.Status.APPROVED).order_by("display_order")
        serializer = MediaUploadSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        upload = self.get_object()
        user = request.user
        if not (user.is_superuser or user.role in (Role.DIRECTOR_MARKETING, Role.EXEC)):
            return Response({"detail": "Marketing Director only."}, status=403)
        serializer = MediaReviewSerializer(upload, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewed_by=user)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny], url_path="approved")
    def approved(self, request):
        # Use __iexact to catch 'Approved', 'approved', or 'APPROVED'
        qs = MediaUpload.objects.filter(status__iexact="Approved").order_by("display_order", "-created_at")
        serializer = MediaUploadSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)