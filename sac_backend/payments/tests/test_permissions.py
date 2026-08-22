from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import as_list, make_user
from payments.models import Payment


class PaymentVisibilityTests(APITestCase):
    def setUp(self):
        self.member1 = make_user("payer_a", role=Role.MEMBER)
        self.member2 = make_user("payer_b", role=Role.MEMBER)
        self.finance_dir = make_user("findir_pay", role=Role.DIRECTOR_FINANCE)

        Payment.objects.create(
            user=self.member1, purpose=Payment.Purpose.DONATION,
            amount=Decimal("10.00"), stripe_checkout_session_id="cs_vis_a",
        )
        Payment.objects.create(
            user=self.member2, purpose=Payment.Purpose.DONATION,
            amount=Decimal("20.00"), stripe_checkout_session_id="cs_vis_b",
        )

    def test_member_sees_only_their_own_payments(self):
        self.client.force_authenticate(user=self.member1)
        response = self.client.get(reverse("payments:mine"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(as_list(response.data)), 1)

    def test_plain_member_cannot_see_all_payments(self):
        self.client.force_authenticate(user=self.member1)
        response = self.client.get(reverse("payments:all"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_finance_director_sees_all_payments(self):
        self.client.force_authenticate(user=self.finance_dir)
        response = self.client.get(reverse("payments:all"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(as_list(response.data)), 2)

    def test_exec_also_sees_all_payments(self):
        exec_user = make_user("exec_pay_vis", role=Role.EXEC)
        self.client.force_authenticate(user=exec_user)
        response = self.client.get(reverse("payments:all"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(as_list(response.data)), 2)

    def test_unauthenticated_cannot_view_own_payments_either(self):
        response = self.client.get(reverse("payments:mine"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)