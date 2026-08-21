from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Request


@receiver(post_save, sender=Request)
def notify_exec_on_new_request(sender, instance: Request, created, **kwargs):
    """
    Fires when a director/officer files a new request from their portal
    page. Controlled by both the per-request `notify_exec` flag and the
    EXEC_NOTIFICATION_EMAILS setting — if that list is empty (e.g. Dale
    said he doesn't want email notifs), this is a no-op.
    """
    if not created or not instance.notify_exec:
        return

    recipients = settings.EXEC_NOTIFICATION_EMAILS
    if not recipients:
        return

    send_mail(
        subject=f"[SAC] New request: {instance.title}",
        message=(
            f"Category: {instance.get_category_display()}\n"
            f"From: {instance.submitted_by}\n\n"
            f"{instance.description}\n\n"
            f"Review it on the Exec Page."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=True,
    )
