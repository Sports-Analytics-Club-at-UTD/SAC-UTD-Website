from datetime import date, time
from decimal import Decimal

from django.core import mail
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import as_list, make_user
from events.models import Event
from finance.models import FundingRequest, FundingRequestItem, FundingRequestModificationLog


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="http://localhost:5173",
)
class FundingRequestWorkflowTests(APITestCase):
    def setUp(self):
        self.member = make_user("member1", role=Role.MEMBER, email="member1@utd.edu")
        self.other_member = make_user("member2", role=Role.MEMBER, email="member2@utd.edu")
        self.director = make_user(
            "fin_dir", role=Role.DIRECTOR_FINANCE, email="finance@utd.edu"
        )
        self.event = Event.objects.create(
            name="March Analytics Workshop",
            date=date(2026, 3, 20),
            start_time=time(18, 0),
            location="ECSS 2.412",
            created_by=self.director,
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _create_event_request(self, title="Workshop Pizza & Supplies"):
        self._auth(self.member)
        return self.client.post(
            "/api/finance/funding-requests/",
            {
                "title": title,
                "scope": FundingRequest.Scope.SPECIFIC_EVENT,
                "event_id": self.event.id,
                "event_classification": FundingRequest.EventClassification.WORKSHOP,
                "room_number": "ECSS 2.412",
                "reservation_id": "RES-9921",
                "notes": "Need pizza and HDMI adapters",
                "items": [
                    {
                        "item_name": "Large Pizza",
                        "quantity": "4",
                        "unit_quantity": "box",
                        "unit_price": "15.00",
                        "category": FundingRequestItem.Category.FOOD,
                    },
                    {
                        "item_name": "HDMI Adapter",
                        "quantity": "2",
                        "unit_quantity": "each",
                        "unit_price": "12.50",
                        "category": FundingRequestItem.Category.TECHNOLOGY,
                    },
                ],
            },
            format="json",
        )

    def test_specific_event_requires_classification_room_and_reservation(self):
        self._auth(self.member)
        resp = self.client.post(
            "/api/finance/funding-requests/",
            {
                "title": "Incomplete Event Request",
                "scope": FundingRequest.Scope.SPECIFIC_EVENT,
                "items": [
                    {
                        "item_name": "Water",
                        "quantity": "1",
                        "unit_price": "10.00",
                        "category": "food",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("event_classification", resp.data)
        self.assertIn("room_number", resp.data)
        self.assertIn("reservation_id", resp.data)

    def test_create_and_approve_with_club_funds_sends_email(self):
        resp = self._create_event_request()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], FundingRequest.Status.UNCHECKED)
        self.assertEqual(Decimal(resp.data["subtotal_amount"]), Decimal("85.00"))
        self.assertEqual(Decimal(resp.data["tax_amount"]), Decimal("7.01"))
        self.assertEqual(Decimal(resp.data["total_amount"]), Decimal("92.01"))
        fr_id = resp.data["id"]

        # Member cannot approve their own request
        self._auth(self.member)
        forbidden = self.client.post(
            f"/api/finance/funding-requests/{fr_id}/approve/",
            {"funding_source": FundingRequest.FundingSource.CLUB_FUNDS},
            format="json",
        )
        self.assertEqual(forbidden.status_code, 403)

        # Finance Director approves with club_funds
        self._auth(self.director)
        mail.outbox.clear()
        approve_resp = self.client.post(
            f"/api/finance/funding-requests/{fr_id}/approve/",
            {"funding_source": FundingRequest.FundingSource.CLUB_FUNDS},
            format="json",
        )
        self.assertEqual(approve_resp.status_code, 200)
        self.assertEqual(approve_resp.data["status"], FundingRequest.Status.APPROVED)
        self.assertTrue(approve_resp.data["approval_id"].startswith("SAC-"))
        self.assertFalse(approve_resp.data["utd_form_required"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(approve_resp.data["approval_id"], mail.outbox[0].body)
        self.assertIn("Club Funds", mail.outbox[0].body)

    def test_utd_programming_funds_quota_limit_and_form_tracking(self):
        self._auth(self.director)
        # Approve 4 UTD Programming Funds requests
        for i in range(4):
            create_resp = self._create_event_request(title=f"UTD Event {i + 1}")
            self.assertEqual(create_resp.status_code, 201)
            self._auth(self.director)
            app_resp = self.client.post(
                f"/api/finance/funding-requests/{create_resp.data['id']}/approve/",
                {"funding_source": FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS},
                format="json",
            )
            self.assertEqual(app_resp.status_code, 200)
            self.assertTrue(app_resp.data["utd_form_required"])
            self.assertFalse(app_resp.data["utd_form_completed"])

        # Check quota endpoint shows 4/4 used
        quota_resp = self.client.get("/api/finance/utd-quota/")
        self.assertEqual(quota_resp.status_code, 200)
        self.assertEqual(quota_resp.data["used_count"], 4)
        self.assertEqual(quota_resp.data["remaining"], 0)
        self.assertTrue(quota_resp.data["is_limit_reached"])

        # 5th UTD request is blocked
        fifth_resp = self._create_event_request(title="UTD Event 5")
        self._auth(self.director)
        blocked = self.client.post(
            f"/api/finance/funding-requests/{fifth_resp.data['id']}/approve/",
            {"funding_source": FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)

        # Toggle UTD form completion on first request
        first_id = as_list(self.client.get("/api/finance/funding-requests/").data)[-1]["id"]
        utd_patch = self.client.patch(
            f"/api/finance/funding-requests/{first_id}/utd-form/",
            {"utd_form_completed": True},
            format="json",
        )
        self.assertEqual(utd_patch.status_code, 200)
        self.assertTrue(utd_patch.data["utd_form_completed"])

    def test_modify_then_confirm_flow_records_diff_and_sends_emails(self):
        create_resp = self._create_event_request()
        fr_id = create_resp.data["id"]

        self._auth(self.director)
        mail.outbox.clear()
        mod_resp = self.client.post(
            f"/api/finance/funding-requests/{fr_id}/modify/",
            {
                "funding_source": FundingRequest.FundingSource.CLUB_FUNDS,
                "summary": "Reduced pizza to 3 boxes and added napkins",
                "items": [
                    {
                        "item_name": "Large Pizza",
                        "quantity": "3",
                        "unit_quantity": "box",
                        "unit_price": "15.00",
                        "category": "food",
                    },
                    {
                        "item_name": "Napkins",
                        "quantity": "1",
                        "unit_quantity": "pack",
                        "unit_price": "5.00",
                        "category": "logistics",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(mod_resp.status_code, 200)
        self.assertEqual(mod_resp.data["status"], FundingRequest.Status.MODIFIED)
        self.assertEqual(Decimal(mod_resp.data["subtotal_amount"]), Decimal("50.00"))
        self.assertEqual(Decimal(mod_resp.data["tax_amount"]), Decimal("4.12"))
        self.assertEqual(Decimal(mod_resp.data["total_amount"]), Decimal("54.12"))
        self.assertEqual(len(mod_resp.data["modification_logs"]), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/confirm?token=", mail.outbox[0].body)

        fr_obj = FundingRequest.objects.get(pk=fr_id)
        token = str(fr_obj.confirmation_token)

        # Requester confirms via token (even without auth header)
        self.client.force_authenticate(user=None)
        mail.outbox.clear()
        confirm_resp = self.client.post(
            f"/api/finance/funding-requests/{fr_id}/confirm/",
            {"token": token},
            format="json",
        )
        self.assertEqual(confirm_resp.status_code, 200)
        self.assertEqual(confirm_resp.data["status"], FundingRequest.Status.APPROVED)
        self.assertTrue(confirm_resp.data["approval_id"].startswith("SAC-"))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(confirm_resp.data["approval_id"], mail.outbox[0].body)

    def test_deny_requires_reason_and_sends_email(self):
        create_resp = self._create_event_request()
        fr_id = create_resp.data["id"]

        self._auth(self.director)
        bad_deny = self.client.post(
            f"/api/finance/funding-requests/{fr_id}/deny/",
            {"denial_reason": "   "},
            format="json",
        )
        self.assertEqual(bad_deny.status_code, 400)

        mail.outbox.clear()
        good_deny = self.client.post(
            f"/api/finance/funding-requests/{fr_id}/deny/",
            {"denial_reason": "Exceeds semester catering cap."},
            format="json",
        )
        self.assertEqual(good_deny.status_code, 200)
        self.assertEqual(good_deny.data["status"], FundingRequest.Status.DENIED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Exceeds semester catering cap.", mail.outbox[0].body)

    def test_member_only_sees_own_requests(self):
        self._create_event_request("Member 1 Request")
        self._auth(self.other_member)
        list_resp = self.client.get("/api/finance/funding-requests/")
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(as_list(list_resp.data)), 0)

    def test_utd_budget_xlsx_export_matches_template(self):
        from io import BytesIO
        import openpyxl

        create_resp = self._create_event_request("HACKAI Workshop Catering")
        fr_id = create_resp.data["id"]
        self._auth(self.director)
        self.client.post(
            f"/api/finance/funding-requests/{fr_id}/approve/",
            {"funding_source": FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS},
            format="json",
        )
        xlsx_resp = self.client.get(
            f"/api/finance/funding-requests/{fr_id}/utd-budget-xlsx/"
        )
        self.assertEqual(xlsx_resp.status_code, 200)
        self.assertEqual(
            xlsx_resp["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        wb = openpyxl.load_workbook(BytesIO(xlsx_resp.content))
        ws = wb["Budget Breakdown"]
        self.assertEqual(ws["H1"].value, "Sports Analytics Club")
        # Food item goes in Food and Drinks (row 32)
        self.assertIn("Large Pizza", ws["B32"].value)
        self.assertEqual(ws["C32"].value, 4)
        self.assertEqual(ws["D32"].value, 15)
        # Technology item goes in Miscellaneous (row 54)
        self.assertIn("HDMI Adapter", ws["B54"].value)
        # Sample placeholder links in row 33/34 were cleared
        self.assertIsNone(ws["H33"].value)
        self.assertIsNone(ws["H34"].value)
        # Formulas preserved
        self.assertTrue(str(ws["F32"].value).startswith("="))
        self.assertTrue(str(ws["G32"].value).startswith("="))
