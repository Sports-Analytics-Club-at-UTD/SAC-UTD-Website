from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from . import views

app_name = "accounts"

urlpatterns = [
    path("signup/", views.SignupView.as_view(), name="signup"),
    path("login/", obtain_auth_token, name="login"),  # POST username/password -> {token}
    path("whoami/", views.WhoAmIView.as_view(), name="whoami"),
    path("me/", views.MeView.as_view(), name="me"),

    # Secretary Page
    path("pending/", views.PendingMembersListView.as_view(), name="pending-members"),
    path("members/", views.AllMembersListView.as_view(), name="all-members"),
    path("members/<int:pk>/", views.MemberDetailView.as_view(), name="member-detail"),
    path("members/<int:pk>/role/", views.UserRoleUpdateView.as_view(), name="member-role-update"),
]
