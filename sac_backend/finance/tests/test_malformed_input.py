from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from finance.models import BudgetCategory


class FinanceMalformedInputTests(APITestCase):
    def setUp(self):
        self.director = make_user("mal_findir", role=Role.DIRECTOR_FINANCE)
        self.client.force_authenticate(user=self.director)
        self.category = BudgetCategory.objects.create(name="Events")
        self.url = reverse("finance:budget-entry-list")

    def test_invalid_entry_type_choice_rejected(self):
        response = self.client.post(
            self.url,
            {
                "category": self.category.id,
                "entry_type": "not_a_real_choice",
                "amount": "50.00",
                "date": "2026-08-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("entry_type", response.data)

    def test_nonexistent_category_id_rejected(self):
        response = self.client.post(
            self.url,
            {"category": 999999, "entry_type": "income", "amount": "50.00", "date": "2026-08-01"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)

    def test_non_numeric_amount_rejected(self):
        response = self.client.post(
            self.url,
            {
                "category": self.category.id,
                "entry_type": "income",
                "amount": "not-a-number",
                "date": "2026-08-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", response.data)

    def test_missing_date_rejected(self):
        response = self.client.post(
            self.url,
            {"category": self.category.id, "entry_type": "income", "amount": "50.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date", response.data)
