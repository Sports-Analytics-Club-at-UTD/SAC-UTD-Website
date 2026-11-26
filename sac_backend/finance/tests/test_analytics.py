from decimal import Decimal

from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import make_user
from finance.models import FundingRequest, FundingRequestItem, RefundRequest


class CostAnalyticsTests(APITestCase):
    def setUp(self):
        self.member = make_user("member", role=Role.MEMBER)
        self.director = make_user("director", role=Role.DIRECTOR_FINANCE)

        fr1 = FundingRequest.objects.create(
            requester=self.member,
            title="Workshop Food",
            scope=FundingRequest.Scope.SPECIFIC_EVENT,
            event_classification=FundingRequest.EventClassification.WORKSHOP,
            room_number="ECSS 2.102",
            reservation_id="R-1",
            status=FundingRequest.Status.APPROVED,
            funding_source=FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS,
            utd_form_required=True,
            utd_form_completed=False,
            approval_id="SAC-2026-AAA111",
        )
        FundingRequestItem.objects.create(
            funding_request=fr1,
            item_name="Tacos",
            quantity=Decimal("10"),
            unit_price=Decimal("10.00"),
            category=FundingRequestItem.Category.FOOD,
        )

        fr2 = FundingRequest.objects.create(
            requester=self.member,
            title="GPU Compute",
            scope=FundingRequest.Scope.PROJECTS_TEAM,
            status=FundingRequest.Status.APPROVED,
            funding_source=FundingRequest.FundingSource.CLUB_FUNDS,
            approval_id="SAC-2026-BBB222",
        )
        FundingRequestItem.objects.create(
            funding_request=fr2,
            item_name="Cloud GPU",
            quantity=Decimal("1"),
            unit_price=Decimal("60.00"),
            category=FundingRequestItem.Category.TECHNOLOGY,
        )

        RefundRequest.objects.create(
            funding_request=fr2,
            approval_id_entered=fr2.approval_id,
            requester=self.member,
            amount_claimed=Decimal("60.00"),
            receipt_storage_path="local://receipt.png",
            receipt_original_filename="receipt.png",
            status=RefundRequest.Status.REIMBURSED,
        )

    def test_analytics_aggregates_and_csv_export(self):
        # Regular member cannot access analytics
        self.client.force_authenticate(user=self.member)
        forbidden = self.client.get("/api/finance/analytics/")
        self.assertEqual(forbidden.status_code, 403)

        # Finance Director sees full breakdown
        self.client.force_authenticate(user=self.director)
        resp = self.client.get("/api/finance/analytics/")
        self.assertEqual(resp.status_code, 200)
        kpis = resp.data["kpis"]
        self.assertEqual(kpis["total_approved"], 160.0)
        self.assertEqual(kpis["total_reimbursed"], 60.0)
        self.assertEqual(kpis["remaining_allocation"], 100.0)
        self.assertEqual(kpis["utd_forms_pending_count"], 1)

        csv_resp = self.client.get("/api/finance/analytics/export.csv")
        self.assertEqual(csv_resp.status_code, 200)
        self.assertEqual(csv_resp["Content-Type"], "text/csv")
        body = csv_resp.content.decode("utf-8")
        self.assertIn("SAC-2026-AAA111", body)
        self.assertIn("SAC-2026-BBB222", body)
