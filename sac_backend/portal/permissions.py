from rest_framework import permissions


class IsDirectorPortalUser(permissions.BasePermission):
    """
    Gate for the Director Portal shell itself: answers "should this
    person even see the portal exists," nothing more specific than
    that. Deliberately separate from every sub-app's own permission
    classes (IsSecretary, IsFinanceDirectorOrReadOnly, IsRndTeam, etc.)
    in accounts/events/finance/media_hub/rnd/requests_hub — those still
    independently gate the actual data and actions within each section.

    This two-layer design matters: even if this class had a bug and let
    someone through, they still couldn't do anything, because every
    concrete endpoint checks its own permission separately. Nothing in
    this app should ever be the *only* thing standing between a member
    and a director-only action.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.is_director))
