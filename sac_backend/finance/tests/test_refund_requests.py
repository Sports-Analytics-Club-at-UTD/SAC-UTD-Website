import tempfile
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import as_list, make_user
from finance.models import FundingRequest, FundingRequestItem, RefundRequest


class RefundRequestTests(APITestCase):
    def setUp(self):
        self.temp_media = tempfile.TemporaryDirectory()
        self.member = make_user("buyer", role=Role.MEMBER, email="buyer@utd.edu")
        self.director = make_user("fin_dir", role=Role.DIRECTOR_FINANCE, email="fin@utd.edu")

        self.approved_fr = FundingRequest.objects.create(
            requester=self.member,
            requester_email=self.member.email,
            title="Cloud Credits",
            scope=FundingRequest.Scope.PROJECTS_TEAM,
            status=FundingRequest.Status.APPROVED,
            funding_source=FundingRequest.FundingSource.CLUB_FUNDS,
            approval_id="SAC-2026-CLD123",
        )
        FundingRequestItem.objects.create(
            funding_request=self.approved_fr,
            item_name="AWS Credits",
            quantity=Decimal("1.00"),
            unit_quantity="month",
            unit_price=Decimal("45.00"),
            category=FundingRequestItem.Category.TECHNOLOGY,
        )

    def tearDown(self):
        self.temp_media.cleanup()

    def test_approval_lookup_valid_and_invalid(self):
        self.client.force_authenticate(user=self.member)
        ok = self.client.get("/api/finance/approval-lookup/?approval_id=sac-2026-cld123")
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ok.data["valid"])
        self.assertEqual(ok.data["title"], "Cloud Credits")
        self.assertEqual(ok.data["approved_total"], "48.71")

        bad = self.client.get("/api/finance/approval-lookup/?approval_id=SAC-0000-NOPE")
        self.assertEqual(bad.status_code, 200)
        self.assertFalse(bad.data["valid"])

    def test_submit_refund_retrieve_receipt_url_and_update_status(self):
        with override_settings(
            MEDIA_ROOT=self.temp_media.name,
            SUPABASE_URL="",
            SUPABASE_SECRET_KEY="",
        ):
            self.client.force_authenticate(user=self.member)
            receipt = SimpleUploadedFile(
                "aws_receipt.png",
                b"\x89PNG\r\n\x1a\nfake-png-bytes",
                content_type="image/png",
            )
            create_resp = self.client.post(
                "/api/finance/refund-requests/",
                {
                    "approval_id": "SAC-2026-CLD123",
                    "comments": "Paid on personal card",
                    "receipt": receipt,
                },
                format="multipart",
            )
            self.assertEqual(create_resp.status_code, 201)
            self.assertEqual(create_resp.data["status"], RefundRequest.Status.PENDING)
            self.assertEqual(Decimal(create_resp.data["amount_claimed"]), Decimal("48.71"))
            refund_id = create_resp.data["id"]

            # Director retrieves signed/local receipt URL & file
            self.client.force_authenticate(user=self.director)
            url_resp = self.client.get(
                f"/api/finance/refund-requests/{refund_id}/receipt-url/"
            )
            self.assertEqual(url_resp.status_code, 200)
            self.assertIn(f"/api/finance/refund-requests/{refund_id}/receipt-file/", url_resp.data["url"])

            file_resp = self.client.get(
                f"/api/finance/refund-requests/{refund_id}/receipt-file/"
            )
            self.assertEqual(file_resp.status_code, 200)

            # Director marks reimbursed
            status_resp = self.client.patch(
                f"/api/finance/refund-requests/{refund_id}/status/",
                {
                    "status": RefundRequest.Status.REIMBURSED,
                    "director_notes": "Zelle sent",
                },
                format="json",
            )
            self.assertEqual(status_resp.status_code, 200)
            self.assertEqual(status_resp.data["status"], RefundRequest.Status.REIMBURSED)
            self.assertEqual(status_resp.data["director_notes"], "Zelle sent")
