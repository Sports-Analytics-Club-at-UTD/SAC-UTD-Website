from decimal import Decimal
from unittest.mock import patch

import stripe
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from events.models import Event, EventRegistration
from finance.models import BudgetEntry
from payments.models import Payment


def _fake_stripe_event(session_id, event_type="checkout.session.completed", payment_intent="pi_test_1"):
    return {
        "type": event_type,
        "data": {"object": {"id": session_id, "payment_intent": payment_intent}},
    }


class StripeWebhookTests(APITestCase):
    def setUp(self):
        self.member = make_user("webhook_payer", role=Role.MEMBER)
        self.webhook_url = reverse("payments:webhook")

    def _post_webhook(self):
        return self.client.post(
            self.webhook_url, data=b"{}", content_type="application/json", HTTP_STRIPE_SIGNATURE="sig"
        )

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_invalid_signature_is_rejected_with_400(self, mock_construct):
        # This is the entire security boundary of this endpoint — if
        # this check is ever accidentally removed or bypassed, ANY
        # request (not just Stripe's real servers) could mark payments
        # as succeeded.
        mock_construct.side_effect = stripe.error.SignatureVerificationError("bad sig", "sig_header")
        response = self._post_webhook()
        self.assertEqual(response.status_code, 400)

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_successful_membership_dues_payment_creates_a_budget_entry(self, mock_construct):
        payment = Payment.objects.create(
            user=self.member, purpose=Payment.Purpose.MEMBERSHIP_DUES,
            amount=Decimal("25.00"), stripe_checkout_session_id="cs_dues_1",
        )
        mock_construct.return_value = _fake_stripe_event("cs_dues_1")

        response = self._post_webhook()

        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCEEDED)
        self.assertIsNotNone(payment.budget_entry)
        self.assertEqual(payment.budget_entry.amount, Decimal("25.00"))
        self.assertEqual(payment.budget_entry.entry_type, BudgetEntry.EntryType.INCOME)
        self.assertEqual(payment.budget_entry.category.name, "Membership Dues")

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_successful_donation_creates_a_budget_entry_in_the_donations_category(self, mock_construct):
        payment = Payment.objects.create(
            user=self.member, purpose=Payment.Purpose.DONATION,
            amount=Decimal("50.00"), stripe_checkout_session_id="cs_donation_1",
        )
        mock_construct.return_value = _fake_stripe_event("cs_donation_1")

        self._post_webhook()

        payment.refresh_from_db()
        self.assertEqual(payment.budget_entry.category.name, "Donations")

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_successful_event_registration_payment_creates_the_registration(self, mock_construct):
        director = make_user("evdir_wh", role=Role.DIRECTOR_EVENTS)
        event = Event.objects.create(
            name="Paid Event", date="2026-09-01", start_time="10:00:00",
            created_by=director, price=Decimal("15.00"),
        )
        Payment.objects.create(
            user=self.member, purpose=Payment.Purpose.EVENT_REGISTRATION,
            amount=Decimal("15.00"), related_event=event,
            stripe_checkout_session_id="cs_event_1",
        )
        mock_construct.return_value = _fake_stripe_event("cs_event_1")

        self._post_webhook()

        self.assertTrue(EventRegistration.objects.filter(event=event, member=self.member).exists())

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_event_registration_payment_does_not_overfill_capacity(self, mock_construct):
        """
        Edge case: someone pays for the literal last seat while, at the
        same moment, someone else takes it through some other path. The
        webhook must not blindly create a registration that pushes the
        event over capacity — the payment still succeeded (that's not
        reversed here), but no orphaned-into-a-full-event registration
        gets created either.
        """
        director = make_user("evdir_wh_full", role=Role.DIRECTOR_EVENTS)
        other_member = make_user("other_wh_payer", role=Role.MEMBER)
        event = Event.objects.create(
            name="Just Filled", date="2026-09-01", start_time="10:00:00",
            created_by=director, price=Decimal("15.00"), capacity=1,
        )
        EventRegistration.objects.create(event=event, member=other_member)  # fills it first

        Payment.objects.create(
            user=self.member, purpose=Payment.Purpose.EVENT_REGISTRATION,
            amount=Decimal("15.00"), related_event=event,
            stripe_checkout_session_id="cs_event_race",
        )
        mock_construct.return_value = _fake_stripe_event("cs_event_race")

        self._post_webhook()

        self.assertFalse(EventRegistration.objects.filter(event=event, member=self.member).exists())

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_webhook_is_idempotent_does_not_double_process(self, mock_construct):
        """
        Stripe explicitly guarantees at-least-once delivery — the same
        event genuinely can arrive more than once. Processing it twice
        must NOT create a second BudgetEntry and double-count real
        money in the club's books.
        """
        payment = Payment.objects.create(
            user=self.member, purpose=Payment.Purpose.MEMBERSHIP_DUES,
            amount=Decimal("25.00"), stripe_checkout_session_id="cs_dupe_1",
        )
        mock_construct.return_value = _fake_stripe_event("cs_dupe_1")

        self._post_webhook()
        self._post_webhook()

        self.assertEqual(BudgetEntry.objects.filter(payment=payment).count(), 1)

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_unknown_session_id_returns_200_not_500(self, mock_construct):
        # Returning an error here would make Stripe retry this webhook
        # forever — 200 tells Stripe "received, don't retry" even
        # though there was nothing on our side to match it to.
        mock_construct.return_value = _fake_stripe_event("cs_never_existed")
        response = self._post_webhook()
        self.assertEqual(response.status_code, 200)

    @patch("payments.views.stripe.Webhook.construct_event")
    def test_expired_checkout_session_marks_payment_expired(self, mock_construct):
        payment = Payment.objects.create(
            user=self.member, purpose=Payment.Purpose.DONATION,
            amount=Decimal("10.00"), stripe_checkout_session_id="cs_expired_1",
        )
        mock_construct.return_value = _fake_stripe_event("cs_expired_1", event_type="checkout.session.expired")

        self._post_webhook()

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.EXPIRED)
        self.assertIsNone(payment.budget_entry)