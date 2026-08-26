from django.urls import path

from . import views

app_name = "portal"

urlpatterns = [
    path("access/", views.PortalAccessView.as_view(), name="access"),
    path("dashboard/", views.PortalDashboardView.as_view(), name="dashboard"),
]
