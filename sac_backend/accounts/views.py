from rest_framework import generics, permissions
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import IsSecretary, IsSelfOrDirectorReadOnly
from .serializers import MemberProfileSerializer, SecretaryUserSerializer, SignupSerializer
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate

class LoginView(ObtainAuthToken):
    """
    POST /api/auth/login/
    Takes username and password, returns token and user ID.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_approved': user.is_approved
        })

class SignupView(generics.CreateAPIView):
    """
    POST /api/auth/signup/
    Public endpoint for the Sign Up Page. Creates a User with
    is_approved=False; the post_save signal in signals.py emails the
    Secretary automatically.
    """

    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # Issue an auth token right away so the frontend can show the
        # "pending approval" state without a second login step.
        user = User.objects.get(id=response.data["id"])
        token, _ = Token.objects.get_or_create(user=user)
        response.data["token"] = token.key
        return response


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/auth/me/
    The logged-in user's own Member Page data.
    """

    serializer_class = MemberProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class MemberDetailView(generics.RetrieveAPIView):
    """
    GET /api/auth/members/<id>/
    Read-only view of another member's profile — used when a director
    or teammate looks someone up (e.g. from the Projects Portal roster).
    """

    queryset = User.objects.filter(is_approved=True)
    serializer_class = MemberProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrDirectorReadOnly]


class PendingMembersListView(generics.ListAPIView):
    """
    GET /api/auth/pending/
    Secretary Page: list of everyone awaiting approval/role assignment.
    """

    queryset = User.objects.filter(is_approved=False).order_by("date_joined")
    serializer_class = SecretaryUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecretary]


class AllMembersListView(generics.ListAPIView):
    """
    GET /api/auth/members/
    Secretary Page: full roster, for changing roles on existing members
    (not just brand-new signups).
    """

    queryset = User.objects.all().order_by("username")
    serializer_class = SecretaryUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecretary]


class UserRoleUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/auth/members/<id>/role/
    Secretary-only: approve a user and/or change their role.
    Body: {"role": "director_finance", "is_approved": true}
    """

    queryset = User.objects.all()
    serializer_class = SecretaryUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecretary]


class WhoAmIView(APIView):
    """
    GET /api/auth/whoami/
    Lightweight endpoint the frontend can call on load to figure out
    what nav items / director-portal tabs to show for the logged-in user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "role_display": user.get_role_display(),
                "is_approved": user.is_approved,
                "is_director": user.is_director,
                "is_officer": user.is_officer,
            }
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def custom_obtain_auth_token(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    if not user:
        return Response({'non_field_errors': ['Unable to log in with provided credentials.']}, status=400)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key})