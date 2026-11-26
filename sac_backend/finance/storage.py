import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
import uuid

from django.conf import settings
from django.urls import reverse
from rest_framework.exceptions import ValidationError


ALLOWED_RECEIPT_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}
ALLOWED_RECEIPT_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
}
MAX_RECEIPT_BYTES = 10 * 1024 * 1024  # 10 MB


def _sanitize_filename(filename: str) -> str:
    base = Path(filename or "receipt").name
    safe = "".join(ch if (ch.isalnum() or ch in "._-") else "_" for ch in base)
    return safe[:120] or "receipt"


def validate_receipt_file(file_obj) -> tuple[str, str]:
    """Validate receipt extension, MIME type, and file size."""
    if not file_obj:
        raise ValidationError({"receipt": "A receipt image or PDF file is required."})

    filename = _sanitize_filename(getattr(file_obj, "name", "receipt"))
    ext = Path(filename).suffix.lower()
    content_type = (getattr(file_obj, "content_type", "") or "").lower()

    if ext not in ALLOWED_RECEIPT_EXTENSIONS:
        raise ValidationError(
            {"receipt": "Unsupported file extension. Allowed: PNG, JPG, JPEG, WEBP, PDF."}
        )
    if content_type and content_type not in ALLOWED_RECEIPT_CONTENT_TYPES:
        raise ValidationError(
            {"receipt": "Unsupported content type. Allowed: image/* or application/pdf."}
        )
    if getattr(file_obj, "size", 0) > MAX_RECEIPT_BYTES:
        raise ValidationError({"receipt": "Receipt file size must be 10 MB or smaller."})

    if not content_type:
        content_type = "application/pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"
    return filename, content_type


def upload_receipt(file_obj, funding_request_id: int) -> dict:
    """
    Upload a refund receipt privately to Supabase Storage when configured,
    or to local MEDIA_ROOT/private_receipts in local dev / tests.
    """
    filename, content_type = validate_receipt_file(file_obj)
    file_bytes = file_obj.read()
    relative_path = f"fr-{funding_request_id}/{uuid.uuid4().hex}_{filename}"

    supabase_url = getattr(settings, "SUPABASE_URL", "").rstrip("/")
    supabase_key = getattr(settings, "SUPABASE_SECRET_KEY", "")
    bucket = getattr(settings, "SUPABASE_RECEIPTS_BUCKET", "receipts")

    if supabase_url and supabase_key:
        encoded_path = urllib.parse.quote(relative_path, safe="/")
        upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{encoded_path}"
        req = urllib.request.Request(
            upload_url,
            data=file_bytes,
            method="POST",
            headers={
                "Authorization": f"Bearer {supabase_key}",
                "apikey": supabase_key,
                "Content-Type": content_type,
                "x-upsert": "false",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status not in (200, 201):
                    raise ValidationError({"receipt": "Failed to upload receipt to Supabase Storage."})
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise ValidationError({"receipt": f"Supabase Storage upload error ({exc.code}): {detail}"})
        except urllib.error.URLError as exc:
            raise ValidationError({"receipt": f"Supabase Storage connection error: {exc.reason}"})

        return {
            "storage_path": relative_path,
            "original_filename": filename,
            "content_type": content_type,
        }

    # Local dev / test fallback (private directory not exposed via static/media unless authorized)
    local_root = Path(settings.MEDIA_ROOT) / "private_receipts"
    dest_path = local_root / relative_path
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(file_bytes)

    return {
        "storage_path": f"local://{relative_path}",
        "original_filename": filename,
        "content_type": content_type,
    }


def resolve_local_receipt_path(storage_path: str) -> Path:
    if not storage_path.startswith("local://"):
        raise ValueError("Not a local receipt path.")
    rel = storage_path[len("local://"):].lstrip("/")
    root = (Path(settings.MEDIA_ROOT) / "private_receipts").resolve()
    candidate = (root / rel).resolve()
    if root not in candidate.parents and candidate != root:
        raise ValueError("Invalid receipt path.")
    return candidate


def get_receipt_signed_url(
    storage_path: str,
    request=None,
    refund_request_id: int | None = None,
    expires_in: int = 900,
) -> str:
    """
    Generate a short-lived signed URL for a private receipt in Supabase Storage,
    or an authenticated local download URL when running in local fallback mode.
    """
    if storage_path.startswith("local://"):
        if refund_request_id is None:
            raise ValidationError({"receipt": "Refund request ID is required for local receipt URL."})
        path = reverse("finance:refund-request-receipt-file", kwargs={"pk": refund_request_id})
        return request.build_absolute_uri(path) if request is not None else path

    supabase_url = getattr(settings, "SUPABASE_URL", "").rstrip("/")
    supabase_key = getattr(settings, "SUPABASE_SECRET_KEY", "")
    bucket = getattr(settings, "SUPABASE_RECEIPTS_BUCKET", "receipts")

    if not supabase_url or not supabase_key:
        raise ValidationError({"receipt": "Supabase Storage is not configured on the server."})

    encoded_path = urllib.parse.quote(storage_path, safe="/")
    sign_url = f"{supabase_url}/storage/v1/object/sign/{bucket}/{encoded_path}"
    payload = json.dumps({"expiresIn": expires_in}).encode("utf-8")
    req = urllib.request.Request(
        sign_url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise ValidationError({"receipt": f"Failed to sign receipt URL ({exc.code}): {detail}"})
    except urllib.error.URLError as exc:
        raise ValidationError({"receipt": f"Supabase Storage connection error: {exc.reason}"})

    signed_part = body.get("signedURL") or body.get("signedUrl") or ""
    if not signed_part:
        raise ValidationError({"receipt": "Supabase Storage did not return a signedURL."})

    if signed_part.startswith("http://") or signed_part.startswith("https://"):
        return signed_part
    if signed_part.startswith("/storage/v1"):
        return f"{supabase_url}{signed_part}"
    if not signed_part.startswith("/"):
        signed_part = f"/{signed_part}"
    return f"{supabase_url}/storage/v1{signed_part}"
