"""
Root URL configuration.

Every app owns its own urls.py; this file just mounts them under /api/.
Keeps things clean as apps get added/removed (matches feature-branch workflow).
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth (login/logout/token + signup + profile + role management)
    path("api/auth/", include("accounts.urls")),

    # Feature areas
    path("api/events/", include("events.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/media/", include("media_hub.urls")),
    path("api/finance/", include("finance.urls")),
    path("api/rnd/", include("rnd.urls")),
    path("api/requests/", include("requests_hub.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
