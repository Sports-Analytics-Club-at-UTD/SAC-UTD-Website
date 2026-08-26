"""
Shared test utilities. Not a Django app — just a plain module every
app's test suite imports from, so we're not copy-pasting user-creation
boilerplate into seven different test files.
"""

from accounts.models import Role, User


def make_user(username="testuser", role=Role.MEMBER, is_approved=True, **kwargs):
    """
    Create a User for tests with sane defaults. Pass role= to get a
    specific director/officer for permission-boundary tests, e.g.:

        secretary = make_user("sec", role=Role.DIRECTOR_SECRETARY)
    """
    email = kwargs.pop("email", f"{username}@sac.test")
    password = kwargs.pop("password", "testpass123!")
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role=role,
        is_approved=is_approved,
        **kwargs,
    )
    return user


def as_list(data):
    """
    Every generic ListAPIView and ModelViewSet.list() in this project
    goes through DRF's global PageNumberPagination, so response.data is
    normally {"count", "next", "previous", "results": [...]}. Custom
    @action endpoints that build their own Response bypass pagination
    and return a bare list. This helper unwraps either shape so tests
    don't have to special-case it every time.
    """
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data
