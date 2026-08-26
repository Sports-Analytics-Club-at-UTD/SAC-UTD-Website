from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from events.models import Event, EventRegistration
from payments.models import Payment


class CreateCheckoutSessionTests(APITestCase):
    def setUp(self):
        self.member = make_user("payer1", role=Role.MEMBER)
        self.client.force_authenticate(user=self.member)

    @patch("payments.views.create_checkout_session")
    def test_membership_dues_uses_server_side_amount(self, mock_create):
        mock_create.return_value = MagicMock(id="cs_test_123", url="https://checkout.stripe.com/pay/cs_test_123")

        response = self.client.post(
            reverse("payments:create-checkout-session"), {"purpose": "membership_dues"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["checkout_url"], "https://checkout.stripe.com/pay/cs_test_123")

        payment = Payment.objects.get(stripe_checkout_session_id="cs_test_123")
        self.assertEqual(payment.purpose, Payment.Purpose.MEMBERSHIP_DUES)
        self.assertEqual(payment.user, self.member)
        self.assertGreater(payment.amount, 0)

    @patch("payments.views.create_checkout_session")
    def test_event_registration_ignores_client_supplied_amount(self, mock_create):
        """
        The security-critical case in this whole app: even when a
        malicious client sends amount=0.01 alongside a real event_id,
        the server must charge Event.price, never the client's number.
        This test deliberately sends a wrong amount to prove it's
        silently ignored, not just "usually correct."
        """
        director = make_user("evdir_pay", role=Role.DIRECTOR_EVENTS)
        event = Event.objects.create(
            name="Paid Workshop", date="2026-09-01", start_time="10:00:00",
            created_by=director, price=Decimal("50.00"),
        )
        mock_create.return_value = MagicMock(id="cs_test_456", url="https://checkout.stripe.com/pay/cs_test_456")

        self.client.post(
            reverse("payments:create-checkout-session"),
            {"purpose": "event_registration", "event_id": event.id, "amount": "0.01"},
            format="json",
        )

        payment = Payment.objects.get(stripe_checkout_session_id="cs_test_456")
        self.assertEqual(payment.amount, Decimal("50.00"))  # NOT 0.01

    @patch("payments.views.create_checkout_session")
    def test_cannot_pay_for_a_free_event(self, mock_create):
        director = make_user("evdir_free", role=Role.DIRECTOR_EVENTS)
        event = Event.objects.create(
            name="Free Mixer", date="2026-09-01", start_time="10:00:00", created_by=director,
        )  # price left blank -> free
        response = self.client.post(
            reverse("payments:create-checkout-session"),
            {"purpose": "event_registration", "event_id": event.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_create.assert_not_called()

    @patch("payments.views.create_checkout_session")
    def test_cannot_start_a_second_payment_for_an_event_already_registered_for(self, mock_create):
        director = make_user("evdir_dup", role=Role.DIRECTOR_EVENTS)
        event = Event.objects.create(
            name="Paid Thing", date="2026-09-01", start_time="10:00:00",
            created_by=director, price=Decimal("10.00"),
        )
        EventRegistration.objects.create(event=event, member=self.member)

        response = self.client.post(
            reverse("payments:create-checkout-session"),
            {"purpose": "event_registration", "event_id": event.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_create.assert_not_called()

    @patch("payments.views.create_checkout_session")
    def test_cannot_pay_for_an_event_at_capacity(self, mock_create):
        director = make_user("evdir_full", role=Role.DIRECTOR_EVENTS)
        other_member = make_user("other_payer", role=Role.MEMBER)
        event = Event.objects.create(
            name="Full Paid Event", date="2026-09-01", start_time="10:00:00",
            created_by=director, price=Decimal("10.00"), capacity=1,
        )
        EventRegistration.objects.create(event=event, member=other_member)

        response = self.client.post(
            reverse("payments:create-checkout-session"),
            {"purpose": "event_registration", "event_id": event.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_create.assert_not_called()

    def test_donation_requires_an_amount(self):
        response = self.client.post(
            reverse("payments:create-checkout-session"), {"purpose": "donation"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("payments.views.create_checkout_session")
    def test_donation_uses_the_client_supplied_amount(self, mock_create):
        # Donation is the ONE purpose where trusting the client's
        # amount is correct — there's no "real price" to check it
        # against, the donor is choosing how much to give.
        mock_create.return_value = MagicMock(id="cs_test_789", url="https://checkout.stripe.com/pay/cs_test_789")
        self.client.post(
            reverse("payments:create-checkout-session"),
            {"purpose": "donation", "amount": "25.00"},
            format="json",
        )
        payment = Payment.objects.get(stripe_checkout_session_id="cs_test_789")
        self.assertEqual(payment.amount, Decimal("25.00"))

    def test_donation_rejects_a_zero_or_negative_amount(self):
        response = self.client.post(
            reverse("payments:create-checkout-session"),
            {"purpose": "donation", "amount": "0.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_create_a_checkout_session(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            reverse("payments:create-checkout-session"), {"purpose": "membership_dues"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)