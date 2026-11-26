from datetime import date
from decimal import Decimal
import re
import secrets
import string

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import FundingRequest


APPROVAL_ID_ALPHABET = string.ascii_uppercase + string.digits


def get_semester_bounds(ref_date: date | None = None) -> tuple[str, date, date]:
    """
    Return (semester_label, start_date, end_date) for the academic semester
    containing ref_date:
      - Jan–May: Spring
      - Jun–Jul: Summer
      - Aug–Dec: Fall
    """
    d = ref_date or timezone.localdate()
    year = d.year
    if 1 <= d.month <= 5:
        return f"Spring {year}", date(year, 1, 1), date(year, 5, 31)
    if 6 <= d.month <= 7:
        return f"Summer {year}", date(year, 6, 1), date(year, 7, 31)
    return f"Fall {year}", date(year, 8, 1), date(year, 12, 31)


def parse_semester_filter(semester_str: str) -> tuple[date, date]:
    """
    Parse semester filter strings such as 'spring_2026', 'summer_2026', 'fall_2026'
    into (start_date, end_date).
    """
    match = re.fullmatch(r"(spring|summer|fall)[_\-\s](\d{4})", semester_str.strip().lower())
    if not match:
        raise ValidationError({"semester": "Invalid semester format. Expected e.g. 'spring_2026', 'summer_2026', or 'fall_2026'."})
    term, year_str = match.groups()
    year = int(year_str)
    if term == "spring":
        return date(year, 1, 1), date(year, 5, 31)
    if term == "summer":
        return date(year, 6, 1), date(year, 7, 31)
    return date(year, 8, 1), date(year, 12, 31)


def get_utd_quota(ref_date: date | None = None, exclude_request_id: int | None = None) -> dict:
    """
    Count UTD Programming Funds requests in the current semester (limit 4/semester).
    Counts requests in APPROVED or MODIFIED states with funding_source=utd_programming_funds.
    """
    semester_label, start_date, end_date = get_semester_bounds(ref_date)
    limit = getattr(settings, "UTD_PROGRAMMING_FUNDS_SEMESTER_LIMIT", 4)

    qs = FundingRequest.objects.filter(
        funding_source=FundingRequest.FundingSource.UTD_PROGRAMMING_FUNDS,
        status__in=[FundingRequest.Status.APPROVED, FundingRequest.Status.MODIFIED],
        created_at__date__gte=start_date,
        created_at__date__lte=end_date,
    )
    if exclude_request_id is not None:
        qs = qs.exclude(pk=exclude_request_id)

    used_count = qs.count()
    remaining = max(0, limit - used_count)
    return {
        "semester": semester_label,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "used_count": used_count,
        "limit": limit,
        "remaining": remaining,
        "is_limit_reached": used_count >= limit,
    }


def validate_utd_quota_for_request(funding_request: FundingRequest) -> dict:
    """Raise ValidationError if selecting UTD Programming Funds would exceed the 4/semester limit."""
    ref_date = funding_request.created_at.date() if funding_request.created_at else timezone.localdate()
    quota = get_utd_quota(ref_date=ref_date, exclude_request_id=funding_request.pk)
    if quota["is_limit_reached"]:
        raise ValidationError(
            {
                "funding_source": (
                    f"UTD Programming Funds limit reached for {quota['semester']} "
                    f"({quota['used_count']}/{quota['limit']} used). Select Club Funds instead."
                )
            }
        )
    return quota


def generate_unique_approval_id() -> str:
    """Generate a unique human-friendly approval ID like SAC-2026-A7F3K9."""
    year = timezone.localdate().year
    for _ in range(25):
        suffix = "".join(secrets.choice(APPROVAL_ID_ALPHABET) for _ in range(6))
        candidate = f"SAC-{year}-{suffix}"
        if not FundingRequest.objects.filter(approval_id=candidate).exists():
            return candidate
    raise RuntimeError("Unable to generate a unique approval_id after 25 attempts.")


def _serialize_item_snapshot(item_dict: dict) -> dict:
    qty = Decimal(str(item_dict["quantity"])).quantize(Decimal("0.01"))
    price = Decimal(str(item_dict["unit_price"])).quantize(Decimal("0.01"))
    line_total = (qty * price).quantize(Decimal("0.01"))
    return {
        "item_name": item_dict["item_name"],
        "quantity": str(qty),
        "unit_quantity": item_dict.get("unit_quantity", ""),
        "unit_price": str(price),
        "category": item_dict["category"],
        "line_total": str(line_total),
    }


def compute_items_diff(old_items: list[dict], new_items: list[dict]) -> dict:
    """
    Compute a clear structured diff between old and new line items for
    FundingRequestModificationLog and modification emails.
    """
    old_snaps = [_serialize_item_snapshot(item) for item in old_items]
    new_snaps = [_serialize_item_snapshot(item) for item in new_items]

    previous_total = sum((Decimal(s["line_total"]) for s in old_snaps), Decimal("0.00")).quantize(
        Decimal("0.01")
    )
    new_total = sum((Decimal(s["line_total"]) for s in new_snaps), Decimal("0.00")).quantize(
        Decimal("0.01")
    )

    unmatched_old = list(old_snaps)
    added = []
    updated = []

    for new_item in new_snaps:
        match_idx = None
        for idx, old_item in enumerate(unmatched_old):
            if (
                old_item["item_name"].strip().lower() == new_item["item_name"].strip().lower()
                and old_item["category"] == new_item["category"]
            ):
                match_idx = idx
                break
        if match_idx is None:
            added.append(new_item)
        else:
            old_item = unmatched_old.pop(match_idx)
            if old_item != new_item:
                updated.append({"before": old_item, "after": new_item})

    removed = unmatched_old
    return {
        "added": added,
        "updated": updated,
        "removed": removed,
        "previous_total": str(previous_total),
        "new_total": str(new_total),
    }
