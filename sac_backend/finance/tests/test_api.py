from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from finance.models import BudgetCategory, BudgetEntry


class FinancePermissionTests(APITestCase):
    def setUp(self):
        self.finance_director = make_user("fin_dir", role=Role.DIRECTOR_FINANCE)
        self.member = make_user("regmember2", role=Role.MEMBER)
        self.category = BudgetCategory.objects.create(name="Events")

    def test_finance_director_can_create_entry(self):
        self.client.force_authenticate(user=self.finance_director)
        payload = {
            "category": self.category.id,
            "entry_type": "expense",
            "amount": "150.00",
            "date": "2026-08-01",
        }
        response = self.client.post(reverse("finance:budget-entry-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BudgetEntry.objects.first().recorded_by, self.finance_director)

    def test_plain_member_can_view_but_not_create_entry(self):
        self.client.force_authenticate(user=self.member)
        payload = {
            "category": self.category.id,
            "entry_type": "income",
            "amount": "50.00",
            "date": "2026-08-01",
        }
        response = self.client.post(reverse("finance:budget-entry-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        list_response = self.client.get(reverse("finance:budget-entry-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)


class FinanceSummaryTests(APITestCase):
    def setUp(self):
        self.finance_director = make_user("fin_dir2", role=Role.DIRECTOR_FINANCE)
        self.events_cat = BudgetCategory.objects.create(name="Events")
        self.merch_cat = BudgetCategory.objects.create(name="Merch")

        BudgetEntry.objects.create(
            category=self.events_cat, entry_type="income", amount=Decimal("500.00"),
            date="2026-08-01", recorded_by=self.finance_director,
        )
        BudgetEntry.objects.create(
            category=self.events_cat, entry_type="expense", amount=Decimal("200.00"),
            date="2026-08-02", recorded_by=self.finance_director,
        )
        BudgetEntry.objects.create(
            category=self.merch_cat, entry_type="expense", amount=Decimal("75.50"),
            date="2026-08-03", recorded_by=self.finance_director,
        )

    def test_summary_totals_and_balance_are_correct(self):
        self.client.force_authenticate(user=self.finance_director)
        response = self.client.get(reverse("finance:budget-entry-summary"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["total_income"]), Decimal("500.00"))
        self.assertEqual(Decimal(response.data["total_expense"]), Decimal("275.50"))
        self.assertEqual(Decimal(response.data["balance"]), Decimal("224.50"))

    def test_summary_breaks_down_by_category(self):
        self.client.force_authenticate(user=self.finance_director)
        response = self.client.get(reverse("finance:budget-entry-summary"))

        category_names = {row["category__name"] for row in response.data["by_category"]}
        self.assertEqual(category_names, {"Events", "Merch"})
