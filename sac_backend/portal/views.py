from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import permissions, views
from rest_framework.response import Response

from accounts.models import Role, User
from events.models import Event
from finance.models import BudgetEntry
from media_hub.models import MediaUpload
from requests_hub.models import Request as SacRequest
from rnd.models import Idea, RndTodo

from .permissions import IsDirectorPortalUser

# Single source of truth mapping each Director Portal "section" (used
# as both the URL segment on the frontend and the dict key in the
# dashboard payload) to the one role that owns it. Exec is handled
# separately below since Exec owns ALL sections, not just its own.
SECTION_ROLES = {
    "secretary": Role.DIRECTOR_SECRETARY,
    "events": Role.DIRECTOR_EVENTS,
    "marketing": Role.DIRECTOR_MARKETING,
    "finance": Role.DIRECTOR_FINANCE,
    "rnd": Role.DIRECTOR_RND,
    "exec": Role.EXEC,
}


def accessible_sections(user):
    """
    The actual IAM decision, in one place. Both PortalAccessView (nav)
    and PortalDashboardView (data) call this so they can never disagree
    about what a given user is allowed to see — there's exactly one
    function that decides, not two copies of the same logic drifting
    apart over time.
    """
    if user.is_superuser or user.role == Role.EXEC:
        return list(SECTION_ROLES.keys())
    for section, role in SECTION_ROLES.items():
        if user.role == role:
            return [section]
    return []


class PortalAccessView(views.APIView):
    """
    GET /api/portal/access/
    Tells the frontend exactly which Director Portal tabs to render.

    Treat this as authoritative for NAVIGATION only. Every actual data
    endpoint behind each tab (accounts/pending/, finance/entries/,
    rnd/ideas/, etc.) enforces its own permission check independently —
    so even if the frontend were somehow tricked into rendering a tab
    it shouldn't, the underlying API calls behind it still 403. This
    endpoint exists so the UI doesn't have to duplicate that role logic
    in six different places to decide what to show.
    """

    permission_classes = [permissions.IsAuthenticated, IsDirectorPortalUser]

    def get(self, request):
        return Response(
            {
                "sections": accessible_sections(request.user),
                "is_exec": request.user.is_superuser or request.user.role == Role.EXEC,
            }
        )


class PortalDashboardView(views.APIView):
    """
    GET /api/portal/dashboard/
    One aggregated summary payload for the Director Portal landing
    page, scoped to whatever sections this user can access — a Finance
    Director's response only ever contains a "finance" key, never
    "secretary" or "rnd", regardless of what's in the database.

    Each number here is a lightweight teaser for the dashboard cards.
    The real, actionable data still lives behind each section's own
    dedicated endpoints (/api/auth/pending/, /api/finance/entries/, etc)
    — this view exists to answer "what needs my attention" at a glance,
    not to replace those endpoints.
    """

    permission_classes = [permissions.IsAuthenticated, IsDirectorPortalUser]

    def get(self, request):
        sections = accessible_sections(request.user)
        data = {}

        if "secretary" in sections:
            data["secretary"] = {
                "pending_members": User.objects.filter(is_approved=False).count(),
            }

        if "events" in sections:
            data["events"] = {
                "upcoming_events": Event.objects.filter(date__gte=timezone.now().date()).count(),
            }

        if "marketing" in sections:
            data["marketing"] = {
                "pending_media": MediaUpload.objects.filter(status=MediaUpload.Status.PENDING).count(),
            }

        if "finance" in sections:
            totals = BudgetEntry.objects.aggregate(
                income=Sum("amount", filter=Q(entry_type="income")),
                expense=Sum("amount", filter=Q(entry_type="expense")),
            )
            income = totals["income"] or 0
            expense = totals["expense"] or 0
            data["finance"] = {"balance": income - expense}

        if "rnd" in sections:
            data["rnd"] = {
                "open_ideas": Idea.objects.filter(status=Idea.Status.PROPOSED).count(),
                "open_todos": RndTodo.objects.filter(status=RndTodo.Status.OPEN).count(),
            }

        if "exec" in sections:
            data["exec"] = {
                "open_requests": SacRequest.objects.filter(status=SacRequest.Status.OPEN).count(),
            }

        return Response(data)
