from django.contrib.auth.models import AbstractUser
from django.db import models

from core.models import TimeStampedModel
from .managers import UserManager


class Role(models.TextChoices):
    """
    Every "director page" and permission check in the project keys off
    this. Add new roles here as the club structure changes — nowhere
    else needs to change for a new role to exist, just the permission
    checks that should allow it.
    """

    MEMBER = "member", "Member"
    OFFICER_MARKETING = "officer_marketing", "Marketing Officer"
    OFFICER_RND = "officer_rnd", "R&D Officer"
    DIRECTOR_SECRETARY = "director_secretary", "Secretary"
    DIRECTOR_EVENTS = "director_events", "Events Director"
    DIRECTOR_MARKETING = "director_marketing", "Marketing Director"
    DIRECTOR_FINANCE = "director_finance", "Finance Director"
    DIRECTOR_RND = "director_rnd", "R&D Director"
    EXEC = "exec", "Exec"


class User(AbstractUser, TimeStampedModel):
    """
    Custom user model (set as AUTH_USER_MODEL in settings). Extends
    Django's built-in auth user with SAC-specific fields:

    - role: drives which Director Portal tab / permissions a user gets
    - is_approved: new signups start False; Secretary flips this to True
      once they've assigned a role (see SecretaryPage feature + signals.py)
    - profile fields: shown on the Member Page
    """

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.MEMBER)
    is_approved = models.BooleanField(
        default=False,
        help_text="Set True by the Secretary once the account is reviewed and a role is assigned.",
    )

    # --- Member profile fields (Member Page) ---
    grade = models.CharField(
        max_length=20,
        blank=True,
        help_text="e.g. Freshman, Sophomore, Junior, Senior, Grad",
    )
    major = models.CharField(max_length=100, blank=True)
    interests = models.TextField(blank=True, help_text="Free text or comma-separated tags")
    favorite_sport = models.CharField(max_length=100, blank=True)
    favorite_team = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)

    objects = UserManager()

    class Meta:
        # Explicit Meta required here: with two abstract parents
        # (AbstractUser + TimeStampedModel) Django won't reliably
        # merge their Meta classes on its own.
        ordering = ["username"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_director(self):
        return self.role.startswith("director_") or self.role == Role.EXEC

    @property
    def is_officer(self):
        return self.role.startswith("officer_")
