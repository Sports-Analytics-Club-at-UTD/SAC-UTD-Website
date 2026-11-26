from django.conf import settings
from django.core.mail import send_mail

from .models import FundingRequest, FundingRequestModificationLog


def _frontend_url() -> str:
    return getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")


def send_funding_approved_email(funding_request: FundingRequest) -> None:
    recipient = funding_request.effective_requester_email
    if not recipient:
        return

    refund_link = f"{_frontend_url()}/finance?tab=refunds&approval_id={funding_request.approval_id}"
    source_label = funding_request.get_funding_source_display()
    utd_note = ""
    if funding_request.funding_source == FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS:
        utd_note = (
            "\nNote: This request is funded via UTD Programming Funds. "
            "The Finance Director will track the required UTD Programming Funds Form.\n"
        )

    subject = f"[SAC Finance] Funding Request Approved — {funding_request.approval_id}"
    message = (
        f"Hello {funding_request.requester.username},\n\n"
        f"Your funding request \"{funding_request.title}\" has been APPROVED.\n\n"
        f"Approval ID: {funding_request.approval_id}\n"
        f"Funding Source: {source_label}\n"
        f"Approved Total: ${funding_request.total_amount}\n"
        f"{utd_note}\n"
        f"Keep your Approval ID ({funding_request.approval_id}) — you will need it when submitting a refund request:\n"
        f"{refund_link}\n\n"
        f"— SAC Finance Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )


def send_funding_modified_email(
    funding_request: FundingRequest, mod_log: FundingRequestModificationLog
) -> None:
    recipient = funding_request.effective_requester_email
    if not recipient:
        return

    confirm_link = (
        f"{_frontend_url()}/finance/requests/{funding_request.pk}/confirm"
        f"?token={funding_request.confirmation_token}"
    )
    diff = mod_log.diff or {}
    lines = []
    if diff.get("added"):
        lines.append("Added items:")
        for item in diff["added"]:
            lines.append(
                f"  + {item['item_name']} ({item['quantity']} x ${item['unit_price']} = ${item['line_total']})"
            )
    if diff.get("updated"):
        lines.append("Updated items:")
        for entry in diff["updated"]:
            b, a = entry["before"], entry["after"]
            lines.append(
                f"  ~ {a['item_name']}: {b['quantity']} x ${b['unit_price']} (${b['line_total']}) "
                f"-> {a['quantity']} x ${a['unit_price']} (${a['line_total']})"
            )
    if diff.get("removed"):
        lines.append("Removed items:")
        for item in diff["removed"]:
            lines.append(
                f"  - {item['item_name']} ({item['quantity']} x ${item['unit_price']} = ${item['line_total']})"
            )

    diff_block = "\n".join(lines) if lines else "Line items were adjusted."
    source_label = funding_request.get_funding_source_display() or "TBD"

    subject = f"[SAC Finance] Action Required: Funding Request Modified — {funding_request.title}"
    message = (
        f"Hello {funding_request.requester.username},\n\n"
        f"The Finance Director has modified your funding request \"{funding_request.title}\".\n"
        f"Selected Funding Source: {source_label}\n"
        f"Previous Total: ${diff.get('previous_total', '0.00')}\n"
        f"New Total: ${diff.get('new_total', funding_request.total_amount)}\n"
        + (f"Director Note: {mod_log.summary}\n" if mod_log.summary else "")
        + f"\nChanges:\n{diff_block}\n\n"
        f"Please review and confirm these changes to finalize approval:\n"
        f"{confirm_link}\n\n"
        f"— SAC Finance Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )


def send_funding_denied_email(funding_request: FundingRequest) -> None:
    recipient = funding_request.effective_requester_email
    if not recipient:
        return

    subject = f"[SAC Finance] Funding Request Denied — {funding_request.title}"
    message = (
        f"Hello {funding_request.requester.username},\n\n"
        f"Your funding request \"{funding_request.title}\" was denied by the Finance Director.\n\n"
        f"Reason:\n{funding_request.denial_reason}\n\n"
        f"If you have questions, please reach out to {settings.FINANCE_DIRECTOR_EMAIL}.\n\n"
        f"— SAC Finance Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )
