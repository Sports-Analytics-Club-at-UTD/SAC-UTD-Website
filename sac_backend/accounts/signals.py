from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User


@receiver(post_save, sender=User)
def notify_secretary_on_signup(sender, instance: User, created, **kwargs):
    """
    Every time a brand new user is created, fire an email to the
    Secretary so they know to review the account and assign a role
    (the Secretary Page reads the list of is_approved=False users and
    does this from the UI — this signal is just the notification).

    Uses settings.EMAIL_BACKEND, which defaults to the console backend
    in dev, so this just prints to the runserver log until real SMTP
    creds are configured in .env.
    """
    if not created:
        return
    if instance.is_superuser:
    # createsuperuser also fires this signal — an admin account isn't
    # a club member awaiting a role, so don't notify the Secretary.
        return

    send_mail(
        subject="[SAC] New member signup awaiting approval",
        message=(
            f"A new user has signed up and needs a role assigned:\n\n"
            f"Username: {instance.username}\n"
            f"Name: {instance.get_full_name() or '(not provided)'}\n"
            f"Email: {instance.email}\n\n"
            f"Review and assign a role in the Secretary Page."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.SECRETARY_EMAIL],
        fail_silently=True,
    )
