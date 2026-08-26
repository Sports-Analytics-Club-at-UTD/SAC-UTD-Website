from rest_framework.permissions import BasePermission

from .models import Role


class IsApprovedUser(BasePermission):
    """Blocks anyone the Secretary hasn't approved yet from using the API."""

    message = "Your account is awaiting Secretary approval."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_approved or request.user.is_superuser)
        )


class IsSecretary(BasePermission):
    """Only the Secretary (or Exec/superuser) can change roles/approve users."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role in (Role.DIRECTOR_SECRETARY, Role.EXEC))
        )


class IsExec(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.role == Role.EXEC))


class IsDirectorOrExec(BasePermission):
    """
    Generic gate for Director Portal pages. Each director sub-page
    (finance, marketing, rnd, events) should further filter to its own
    director role in the view itself — this just keeps plain members out.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.is_director))


class IsSelfOrDirectorReadOnly(BasePermission):
    """Members can edit their own profile; directors/exec can view anyone's."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if obj == request.user:
            return True
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return request.user.is_director
        return False
