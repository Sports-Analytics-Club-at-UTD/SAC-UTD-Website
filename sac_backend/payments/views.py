from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from events.models import Event, EventRegistration
from finance.models import BudgetCategory, BudgetEntry

from .models import Payment
from .serializers import CreateCheckoutSessionSerializer, PaymentSerializer
from .stripe_client import create_checkout_session


class CreateCheckoutSessionView(APIView):
    """
    POST /api/payments/create-checkout-session/
    Body shape depends on purpose:
      {"purpose": "event_registration", "event_id": 5}
      {"purpose": "membership_dues"}
      {"purpose": "donation", "amount": "25.00"}
    Returns {"checkout_url": "https://checkout.stripe.com/..."} — the
    frontend just redirects the browser there. Stripe hosts the actual
    payment form; this app never sees card details.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateCheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purpose = serializer.validated_data["purpose"]

        related_event = None

        if purpose == Payment.Purpose.EVENT_REGISTRATION:
            try:
                related_event = Event.objects.get(pk=serializer.validated_data["event_id"])
            except Event.DoesNotExist:
                return Response({"event_id": "Event not found."}, status=400)
            if not related_event.price:
                return Response(
                    {"detail": "This event is free — register directly, no payment needed."}, status=400
                )
            if EventRegistration.objects.filter(event=related_event, member=request.user).exists():
                return Response({"detail": "Already registered."}, status=400)
            if related_event.is_full:
                return Response({"detail": "Event is at capacity."}, status=400)
            amount = related_event.price
            description = f"Registration: {related_event.name}"

        elif purpose == Payment.Purpose.MEMBERSHIP_DUES:
            amount = Decimal(str(settings.MEMBERSHIP_DUES_AMOUNT))
            description = "SAC Membership Dues"

        else:  # donation — the one purpose where the client's amount is real
            amount = serializer.validated_data["amount"]
            description = "Donation to Sports Analytics Club"

        session = create_checkout_session(
            amount=amount,
            currency="usd",
            description=description,
            success_url=settings.STRIPE_CHECKOUT_SUCCESS_URL,
            cancel_url=settings.STRIPE_CHECKOUT_CANCEL_URL,
            metadata={
                "purpose": purpose,
                "user_id": str(request.user.id),
                "event_id": str(related_event.id) if related_event else "",
            },
        )

        Payment.objects.create(
            user=request.user,
            purpose=purpose,
            amount=amount,
            related_event=related_event,
            stripe_checkout_session_id=session.id,
        )

        return Response({"checkout_url": session.url}, status=201)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Called directly by Stripe's servers — never by our own frontend, no
    Django session, no auth token. The ONLY thing that proves a request
    here genuinely came from Stripe is the signature verification
    below. Skipping that check would mean anyone could POST a fake
    "payment succeeded" event and get free event registration or
    membership credit.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except (ValueError, stripe.error.SignatureVerificationError):
            return HttpResponse(status=400)

        if event["type"] == "checkout.session.completed":
            _handle_checkout_completed(event["data"]["object"])
        elif event["type"] == "checkout.session.expired":
            _handle_checkout_expired(event["data"]["object"])

        return HttpResponse(status=200)


def _handle_checkout_completed(session_obj):
    """
    Stripe explicitly guarantees at-least-once webhook delivery — the
    same event CAN and DOES arrive more than once in practice. This
    function must be idempotent: re-processing an already-succeeded
    Payment must not create a second BudgetEntry and double-count real
    money in the club's books. The status check happens INSIDE the
    locked transaction, not before it, so two near-simultaneous
    deliveries of the same event can't both pass the check before
    either has written its result — the same class of race condition
    fixed earlier in events/views.py's registration flow.
    """
    session_id = session_obj["id"]

    with transaction.atomic():
        try:
            payment = Payment.objects.select_for_update().get(stripe_checkout_session_id=session_id)
        except Payment.DoesNotExist:
            # Nothing to do — possibly a session from a different
            # environment, or the Payment row was somehow never created.
            # Returning cleanly (not erroring) matters: an error here
            # would make Stripe retry this webhook indefinitely.
            return

        if payment.status == Payment.Status.SUCCEEDED:
            return  # idempotency guard — already processed

        payment.status = Payment.Status.SUCCEEDED
        payment.stripe_payment_intent_id = session_obj.get("payment_intent", "")

        category_name = {
            Payment.Purpose.EVENT_REGISTRATION: "Event Registration",
            Payment.Purpose.MEMBERSHIP_DUES: "Membership Dues",
            Payment.Purpose.DONATION: "Donations",
        }[payment.purpose]
        category, _ = BudgetCategory.objects.get_or_create(name=category_name)

        budget_entry = BudgetEntry.objects.create(
            category=category,
            entry_type=BudgetEntry.EntryType.INCOME,
            amount=payment.amount,
            date=payment.created_at.date(),
            description=f"{payment.get_purpose_display()} — {payment.user}",
            recorded_by=None,
            stripe_payment_id=payment.stripe_payment_intent_id,
            related_event=payment.related_event,
        )
        payment.budget_entry = budget_entry
        payment.save()

        if payment.purpose == Payment.Purpose.EVENT_REGISTRATION and payment.related_event_id:
            event = Event.objects.select_for_update().get(pk=payment.related_event_id)
            if not event.is_full:
                EventRegistration.objects.get_or_create(event=event, member=payment.user)


def _handle_checkout_expired(session_obj):
    Payment.objects.filter(
        stripe_checkout_session_id=session_obj["id"], status=Payment.Status.PENDING
    ).update(status=Payment.Status.EXPIRED)


class MyPaymentsView(generics.ListAPIView):
    """GET /api/payments/mine/ — the logged-in user's own payment history."""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)


class IsFinanceOrExec(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user.is_authenticated
            and (user.is_superuser or user.role in (Role.DIRECTOR_FINANCE, Role.EXEC))
        )


class AllPaymentsView(generics.ListAPIView):
    """GET /api/payments/ — Finance Director/Exec only, every payment recorded."""

    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinanceOrExec]