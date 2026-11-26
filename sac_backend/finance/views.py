import csv
from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Sum
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from .emails import (
    send_funding_approved_email,
    send_funding_denied_email,
    send_funding_modified_email,
)
from .models import (
    BudgetCategory,
    BudgetEntry,
    FundingRequest,
    FundingRequestItem,
    FundingRequestModificationLog,
    RefundRequest,
)
from .serializers import (
    BudgetCategorySerializer,
    BudgetEntrySerializer,
    FundingApproveSerializer,
    FundingDenySerializer,
    FundingModifySerializer,
    FundingRequestItemSerializer,
    FundingRequestSerializer,
    RefundRequestSerializer,
    RefundStatusUpdateSerializer,
    UtdFormUpdateSerializer,
)
from .services import (
    compute_items_diff,
    generate_unique_approval_id,
    get_utd_quota,
    parse_semester_filter,
    validate_utd_quota_for_request,
)
from .storage import (
    get_receipt_signed_url,
    resolve_local_receipt_path,
    upload_receipt,
)


def _is_finance_director(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or user.role in (Role.DIRECTOR_FINANCE, Role.EXEC))
    )


class IsFinanceDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        return _is_finance_director(request.user)


class IsFinanceDirectorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return _is_finance_director(request.user)


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsFinanceDirectorOrReadOnly]


class BudgetEntryViewSet(viewsets.ModelViewSet):
    """
    /api/finance/entries/                CRUD, filter with ?category=&entry_type=&date_after=
    /api/finance/entries/summary/        aggregated totals for chart widgets
    """

    queryset = BudgetEntry.objects.select_related("category")
    serializer_class = BudgetEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsFinanceDirectorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.get_queryset()
        income = (
            qs.filter(entry_type=BudgetEntry.EntryType.INCOME).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )
        expense = (
            qs.filter(entry_type=BudgetEntry.EntryType.EXPENSE).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )
        by_category = (
            qs.values("category__name", "entry_type")
            .annotate(total=Sum("amount"))
            .order_by("category__name")
        )
        return Response(
            {
                "total_income": income,
                "total_expense": expense,
                "balance": income - expense,
                "by_category": list(by_category),
            }
        )


def _apply_date_and_semester_filters(qs, params):
    semester = params.get("semester")
    if semester:
        start_d, end_d = parse_semester_filter(semester)
        qs = qs.filter(created_at__date__gte=start_d, created_at__date__lte=end_d)

    date_from = params.get("date_from")
    if date_from:
        try:
            parsed_from = date.fromisoformat(date_from)
        except ValueError:
            raise ValidationError({"date_from": "Invalid ISO date (YYYY-MM-DD)."})
        qs = qs.filter(created_at__date__gte=parsed_from)

    date_to = params.get("date_to")
    if date_to:
        try:
            parsed_to = date.fromisoformat(date_to)
        except ValueError:
            raise ValidationError({"date_to": "Invalid ISO date (YYYY-MM-DD)."})
        qs = qs.filter(created_at__date__lte=parsed_to)

    return qs


class FundingRequestViewSet(viewsets.ModelViewSet):
    """
    /api/finance/funding-requests/
    Supports member submission, Finance Director review (approve/modify/deny),
    requester confirmation on modified requests, and UTD form completion tracking.
    """

    serializer_class = FundingRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = (
            FundingRequest.objects.select_related(
                "requester", "reviewed_by", "event"
            )
            .prefetch_related("items", "modification_logs__modified_by")
            .all()
        )
        if not _is_finance_director(self.request.user):
            qs = qs.filter(requester=self.request.user)

        params = self.request.query_params
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("scope"):
            qs = qs.filter(scope=params["scope"])
        if params.get("funding_source"):
            qs = qs.filter(funding_source=params["funding_source"])
        if params.get("category"):
            qs = qs.filter(items__category=params["category"]).distinct()
        qs = _apply_date_and_semester_filters(qs, params)
        return qs

    def perform_create(self, serializer):
        email = serializer.validated_data.get("requester_email") or self.request.user.email
        serializer.save(requester=self.request.user, requester_email=email)

    @action(detail=True, methods=["post"], permission_classes=[IsFinanceDirector])
    def approve(self, request, pk=None):
        funding_request = self.get_object()
        if funding_request.status != FundingRequest.Status.UNCHECKED:
            raise ValidationError(
                {
                    "status": f"Only unchecked requests can be approved directly (current: {funding_request.status})."
                }
            )

        ser = FundingApproveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        funding_source = ser.validated_data["funding_source"]

        if funding_source == FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS:
            validate_utd_quota_for_request(funding_request)

        with transaction.atomic():
            funding_request.funding_source = funding_source
            funding_request.utd_form_required = (
                funding_source == FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS
            )
            funding_request.status = FundingRequest.Status.APPROVED
            funding_request.approval_id = generate_unique_approval_id()
            funding_request.reviewed_by = request.user
            funding_request.reviewed_at = timezone.now()
            funding_request.save()

        send_funding_approved_email(funding_request)
        return Response(self.get_serializer(funding_request).data)

    @action(detail=True, methods=["post"], permission_classes=[IsFinanceDirector])
    def modify(self, request, pk=None):
        funding_request = self.get_object()
        if funding_request.status != FundingRequest.Status.UNCHECKED:
            raise ValidationError(
                {
                    "status": f"Only unchecked requests can be modified (current: {funding_request.status})."
                }
            )

        ser = FundingModifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        funding_source = ser.validated_data["funding_source"]
        summary = ser.validated_data.get("summary", "")
        new_items = ser.validated_data["items"]

        if funding_source == FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS:
            validate_utd_quota_for_request(funding_request)

        old_items = [
            {
                "item_name": item.item_name,
                "quantity": item.quantity,
                "unit_quantity": item.unit_quantity,
                "unit_price": item.unit_price,
                "category": item.category,
            }
            for item in funding_request.items.all()
        ]
        diff = compute_items_diff(old_items, new_items)

        with transaction.atomic():
            funding_request.items.all().delete()
            for idx, item in enumerate(new_items):
                item_data = dict(item)
                item_data["sort_order"] = idx
                FundingRequestItem.objects.create(
                    funding_request=funding_request, **item_data
                )

            funding_request.funding_source = funding_source
            funding_request.utd_form_required = (
                funding_source == FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS
            )
            funding_request.status = FundingRequest.Status.MODIFIED
            funding_request.reviewed_by = request.user
            funding_request.reviewed_at = timezone.now()
            funding_request.save()

            mod_log = FundingRequestModificationLog.objects.create(
                funding_request=funding_request,
                modified_by=request.user,
                summary=summary,
                diff=diff,
            )

        funding_request.refresh_from_db()
        send_funding_modified_email(funding_request, mod_log)
        return Response(self.get_serializer(funding_request).data)

    @action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[permissions.AllowAny],
    )
    def confirm(self, request, pk=None):
        """
        GET: Inspect modified request details using valid confirmation_token or owner auth.
        POST: Confirm modifications and transition modified -> approved.
        """
        funding_request = get_object_or_404(
            FundingRequest.objects.select_related("requester", "reviewed_by", "event")
            .prefetch_related("items", "modification_logs__modified_by"),
            pk=pk,
        )
        token = (
            request.query_params.get("token")
            or (request.data.get("token") if isinstance(request.data, dict) else None)
            or ""
        ).strip()

        token_valid = bool(token and token == str(funding_request.confirmation_token))
        owner_valid = bool(
            request.user
            and request.user.is_authenticated
            and request.user.pk == funding_request.requester_id
        )
        if not (token_valid or owner_valid):
            raise PermissionDenied("Valid confirmation token or requester login required.")

        if request.method == "GET":
            return Response(self.get_serializer(funding_request).data)

        if funding_request.status != FundingRequest.Status.MODIFIED:
            raise ValidationError(
                {
                    "status": f"Only modified requests can be confirmed (current: {funding_request.status})."
                }
            )
        if not funding_request.funding_source:
            raise ValidationError(
                {"funding_source": "Funding source must be set before approval."}
            )
        if funding_request.funding_source == FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS:
            validate_utd_quota_for_request(funding_request)

        with transaction.atomic():
            funding_request.status = FundingRequest.Status.APPROVED
            funding_request.approval_id = generate_unique_approval_id()
            funding_request.confirmed_at = timezone.now()
            funding_request.save()

        send_funding_approved_email(funding_request)
        return Response(self.get_serializer(funding_request).data)

    @action(detail=True, methods=["post"], permission_classes=[IsFinanceDirector])
    def deny(self, request, pk=None):
        funding_request = self.get_object()
        if funding_request.status not in (
            FundingRequest.Status.UNCHECKED,
            FundingRequest.Status.MODIFIED,
        ):
            raise ValidationError(
                {
                    "status": f"Only unchecked or modified requests can be denied (current: {funding_request.status})."
                }
            )

        ser = FundingDenySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        funding_request.status = FundingRequest.Status.DENIED
        funding_request.denial_reason = ser.validated_data["denial_reason"]
        funding_request.reviewed_by = request.user
        funding_request.reviewed_at = timezone.now()
        funding_request.save()

        send_funding_denied_email(funding_request)
        return Response(self.get_serializer(funding_request).data)

    @action(
        detail=True,
        methods=["patch"],
        url_path="utd-form",
        permission_classes=[IsFinanceDirector],
    )
    def utd_form(self, request, pk=None):
        funding_request = self.get_object()
        if (
            funding_request.funding_source
            != FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS
        ):
            raise ValidationError(
                {
                    "funding_source": "UTD Programming Funds Form tracking only applies to UTD Programming Funds requests."
                }
            )

        ser = UtdFormUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        completed = ser.validated_data["utd_form_completed"]

        funding_request.utd_form_completed = completed
        funding_request.utd_form_completed_at = timezone.now() if completed else None
        funding_request.save(
            update_fields=["utd_form_completed", "utd_form_completed_at", "updated_at"]
        )
        return Response(self.get_serializer(funding_request).data)


class UtdQuotaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(get_utd_quota())


class ApprovalLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        approval_id = (request.query_params.get("approval_id") or "").strip()
        if not approval_id:
            return Response(
                {"valid": False, "detail": "Enter an Approval ID to look up."},
                status=status.HTTP_200_OK,
            )

        fr = (
            FundingRequest.objects.select_related("event")
            .prefetch_related("items")
            .filter(
                approval_id__iexact=approval_id,
                status=FundingRequest.Status.APPROVED,
            )
            .first()
        )
        if not fr:
            return Response(
                {
                    "valid": False,
                    "detail": "No approved funding request found for that Approval ID.",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "valid": True,
                "funding_request_id": fr.id,
                "approval_id": fr.approval_id,
                "title": fr.title,
                "scope": fr.scope,
                "event_name": fr.event.name if fr.event_id else None,
                "event_classification": fr.event_classification,
                "funding_source": fr.funding_source,
                "approved_total": str(fr.total_amount),
                "items": FundingRequestItemSerializer(fr.items.all(), many=True).data,
            }
        )


class RefundRequestViewSet(viewsets.ModelViewSet):
    """
    /api/finance/refund-requests/
    Members submit refund requests with an approved approval_id and private receipt upload.
    Finance Directors review receipts side-by-side with approved line items and update status.
    """

    serializer_class = RefundRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = (
            RefundRequest.objects.select_related(
                "funding_request",
                "funding_request__event",
                "requester",
                "reviewed_by",
            )
            .prefetch_related("funding_request__items")
            .all()
        )
        if not _is_finance_director(self.request.user):
            qs = qs.filter(requester=self.request.user)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def create(self, request, *args, **kwargs):
        approval_id = (request.data.get("approval_id") or "").strip()
        if not approval_id:
            raise ValidationError({"approval_id": "Approval ID is required."})

        funding_request = (
            FundingRequest.objects.prefetch_related("items")
            .filter(
                approval_id__iexact=approval_id,
                status=FundingRequest.Status.APPROVED,
            )
            .first()
        )
        if not funding_request:
            raise ValidationError(
                {
                    "approval_id": "Invalid Approval ID. Must match an approved funding request."
                }
            )

        receipt_file = request.FILES.get("receipt")
        upload_meta = upload_receipt(receipt_file, funding_request.id)

        raw_amount = request.data.get("amount_claimed")
        if raw_amount not in (None, ""):
            try:
                amount_claimed = Decimal(str(raw_amount)).quantize(Decimal("0.01"))
            except (InvalidOperation, ValueError):
                raise ValidationError({"amount_claimed": "Invalid dollar amount."})
            if amount_claimed <= Decimal("0"):
                raise ValidationError(
                    {"amount_claimed": "Amount claimed must be greater than 0."}
                )
        else:
            amount_claimed = funding_request.total_amount

        refund = RefundRequest.objects.create(
            funding_request=funding_request,
            approval_id_entered=funding_request.approval_id,
            requester=request.user,
            amount_claimed=amount_claimed,
            receipt_storage_path=upload_meta["storage_path"],
            receipt_original_filename=upload_meta["original_filename"],
            receipt_content_type=upload_meta["content_type"],
            comments=(request.data.get("comments") or "").strip(),
        )
        return Response(
            self.get_serializer(refund).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"], url_path="receipt-url")
    def receipt_url(self, request, pk=None):
        refund = self.get_object()
        url = get_receipt_signed_url(
            refund.receipt_storage_path,
            request=request,
            refund_request_id=refund.id,
        )
        return Response(
            {
                "url": url,
                "expires_in": 900,
                "filename": refund.receipt_original_filename,
                "content_type": refund.receipt_content_type,
            }
        )

    @action(detail=True, methods=["get"], url_path="receipt-file")
    def receipt_file(self, request, pk=None):
        refund = self.get_object()
        if not refund.receipt_storage_path.startswith("local://"):
            raise ValidationError(
                {"receipt": "Use receipt-url for remote Supabase Storage receipts."}
            )
        path = resolve_local_receipt_path(refund.receipt_storage_path)
        if not path.exists():
            return Response(
                {"detail": "Receipt file not found."}, status=status.HTTP_404_NOT_FOUND
            )
        with open(path, "rb") as receipt_fh:
            data = receipt_fh.read()
        response = HttpResponse(
            data,
            content_type=refund.receipt_content_type or "application/octet-stream",
        )
        response["Content-Disposition"] = (
            f'inline; filename="{refund.receipt_original_filename}"'
        )
        return response

    @action(
        detail=True,
        methods=["patch"],
        url_path="status",
        permission_classes=[IsFinanceDirector],
    )
    def update_status(self, request, pk=None):
        refund = self.get_object()
        ser = RefundStatusUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        refund.status = ser.validated_data["status"]
        refund.director_notes = ser.validated_data.get("director_notes", "")
        refund.reviewed_by = request.user
        refund.reviewed_at = timezone.now()
        refund.save()
        return Response(self.get_serializer(refund).data)


def _compute_analytics_payload(params):
    approved_qs = (
        FundingRequest.objects.filter(status=FundingRequest.Status.APPROVED)
        .select_related("event", "requester")
        .prefetch_related("items", "refund_requests")
    )
    approved_qs = _apply_date_and_semester_filters(approved_qs, params)
    approved_requests = list(approved_qs)

    category_totals = {
        cat: Decimal("0.00") for cat, _ in FundingRequestItem.Category.choices
    }
    source_totals = {
        src: {"total": Decimal("0.00"), "count": 0}
        for src, _ in FundingRequest.FundingSource.choices
    }
    scope_buckets = {
        "social": {"label": "Social Event", "total": Decimal("0.00"), "count": 0},
        "workshop": {"label": "Workshop Event", "total": Decimal("0.00"), "count": 0},
        "speaker_event": {
            "label": "Speaker Event",
            "total": Decimal("0.00"),
            "count": 0,
        },
        "projects": {"label": "Projects Event", "total": Decimal("0.00"), "count": 0},
        "projects_team": {"label": "Projects Team", "total": Decimal("0.00"), "count": 0},
        "miscellaneous": {"label": "Miscellaneous", "total": Decimal("0.00"), "count": 0},
    }
    approved_vs_reimbursed = {
        src: {
            "approved": Decimal("0.00"),
            "reimbursed": Decimal("0.00"),
            "pending_reimbursement": Decimal("0.00"),
        }
        for src, _ in FundingRequest.FundingSource.choices
    }

    total_approved = Decimal("0.00")
    total_reimbursed = Decimal("0.00")
    pending_reimbursement = Decimal("0.00")
    utd_forms_pending_count = 0

    for fr in approved_requests:
        fr_total = fr.total_amount
        total_approved += fr_total

        for item in fr.items.all():
            category_totals[item.category] = (
                category_totals.get(item.category, Decimal("0.00")) + item.line_total
            )

        src = fr.funding_source or FundingRequest.FundingSource.CLUB_FUNDS
        if src in source_totals:
            source_totals[src]["total"] += fr_total
            source_totals[src]["count"] += 1
            approved_vs_reimbursed[src]["approved"] += fr_total

        if fr.scope == FundingRequest.Scope.SPECIFIC_EVENT:
            bucket_key = fr.event_classification or "miscellaneous"
        elif fr.scope == FundingRequest.Scope.PROJECTS_TEAM:
            bucket_key = "projects_team"
        else:
            bucket_key = "miscellaneous"

        if bucket_key in scope_buckets:
            scope_buckets[bucket_key]["total"] += fr_total
            scope_buckets[bucket_key]["count"] += 1

        if (
            fr.funding_source == FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS
            and not fr.utd_form_completed
        ):
            utd_forms_pending_count += 1

        for refund in fr.refund_requests.all():
            if refund.status == RefundRequest.Status.REIMBURSED:
                total_reimbursed += refund.amount_claimed
                if src in approved_vs_reimbursed:
                    approved_vs_reimbursed[src]["reimbursed"] += refund.amount_claimed
            elif refund.status == RefundRequest.Status.PENDING:
                pending_reimbursement += refund.amount_claimed
                if src in approved_vs_reimbursed:
                    approved_vs_reimbursed[src]["pending_reimbursement"] += (
                        refund.amount_claimed
                    )

    remaining_allocation = max(Decimal("0.00"), total_approved - total_reimbursed)
    pending_review_count = FundingRequest.objects.filter(
        status__in=[FundingRequest.Status.UNCHECKED, FundingRequest.Status.MODIFIED]
    ).count()
    pending_refund_count = RefundRequest.objects.filter(
        status=RefundRequest.Status.PENDING
    ).count()

    return {
        "kpis": {
            "total_approved": float(total_approved),
            "total_reimbursed": float(total_reimbursed),
            "pending_reimbursement": float(pending_reimbursement),
            "remaining_allocation": float(remaining_allocation),
            "approved_request_count": len(approved_requests),
            "pending_review_count": pending_review_count,
            "pending_refund_count": pending_refund_count,
            "utd_forms_pending_count": utd_forms_pending_count,
        },
        "utd_quota": get_utd_quota(),
        "by_category": [
            {"category": cat, "total": float(val)}
            for cat, val in category_totals.items()
        ],
        "by_funding_source": [
            {
                "funding_source": src,
                "label": dict(FundingRequest.FundingSource.choices).get(src, src),
                "total": float(data["total"]),
                "count": data["count"],
            }
            for src, data in source_totals.items()
        ],
        "by_scope_classification": [
            {
                "bucket": key,
                "label": data["label"],
                "total": float(data["total"]),
                "count": data["count"],
            }
            for key, data in scope_buckets.items()
        ],
        "approved_vs_reimbursed": [
            {
                "funding_source": src,
                "label": dict(FundingRequest.FundingSource.choices).get(src, src),
                "approved": float(vals["approved"]),
                "reimbursed": float(vals["reimbursed"]),
                "pending_reimbursement": float(vals["pending_reimbursement"]),
            }
            for src, vals in approved_vs_reimbursed.items()
        ],
        "requests": approved_requests,
    }


class CostAnalyticsView(APIView):
    permission_classes = [IsFinanceDirector]

    def get(self, request):
        payload = _compute_analytics_payload(request.query_params)
        payload.pop("requests", None)
        return Response(payload)


class CostAnalyticsCsvExportView(APIView):
    permission_classes = [IsFinanceDirector]

    def get(self, request):
        payload = _compute_analytics_payload(request.query_params)
        approved_requests = payload["requests"]

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="sac-finance-audit.csv"'
        )
        writer = csv.writer(response)
        writer.writerow(
            [
                "Approval ID",
                "Title",
                "Scope",
                "Event Classification",
                "Event Name",
                "Room Number",
                "Reservation ID",
                "Funding Source",
                "UTD Form Completed",
                "Status",
                "Requester",
                "Approved Total",
                "Reimbursed Total",
                "Pending Refund Total",
                "Created At",
            ]
        )

        for fr in approved_requests:
            reimbursed = sum(
                (
                    r.amount_claimed
                    for r in fr.refund_requests.all()
                    if r.status == RefundRequest.Status.REIMBURSED
                ),
                Decimal("0.00"),
            )
            pending_refund = sum(
                (
                    r.amount_claimed
                    for r in fr.refund_requests.all()
                    if r.status == RefundRequest.Status.PENDING
                ),
                Decimal("0.00"),
            )
            writer.writerow(
                [
                    fr.approval_id or "",
                    fr.title,
                    fr.get_scope_display(),
                    fr.get_event_classification_display() if fr.event_classification else "",
                    fr.event.name if fr.event_id else "",
                    fr.room_number,
                    fr.reservation_id,
                    fr.get_funding_source_display() if fr.funding_source else "",
                    "Yes" if fr.utd_form_completed else ("No" if fr.utd_form_required else "N/A"),
                    fr.get_status_display(),
                    fr.requester.username,
                    f"{fr.total_amount:.2f}",
                    f"{reimbursed:.2f}",
                    f"{pending_refund:.2f}",
                    fr.created_at.isoformat(),
                ]
            )
        return response
