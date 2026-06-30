"""
app/services/po_service.py
Business logic for Purchase Orders — local file storage version.
"""
import logging
import uuid
import os
from datetime import date, datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.po_record import PORecord
from app.services.ocr_service import DocType, extract_document

logger = logging.getLogger(__name__)

# Local uploads folder
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# ── Date fields that need coercion from OCR string → Python date ──────────────
_DATE_FIELDS = {"po_date", "shipment_start", "shipment_end"}

# Fields from the OCR result that map directly onto PORecord columns
_MAPPABLE_FIELDS = {
    "po_number",
    "po_date",
    "buyer_name",
    "buyer_country",
    "seller_name",
    "quantity_bags",
    "bag_weight_kg",
    "quality_description",
    "crop_year",
    "price_per_unit",
    "price_currency",
    "incoterms",
    "shipment_start",
    "shipment_end",
    "origin_port",
    "destination_port",
    "payment_terms",
    "eudr_compliant",
    "sample_required",
    "sample_sent",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_date(value: str | date | None) -> date | None:
    """
    Convert a 'YYYY-MM-DD' string to a Python date object.
    Passes through an existing date unchanged.
    Returns None for null / unparseable OCR output (safe DB NULL).
    """
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except ValueError:
        logger.warning("Could not parse date value from OCR: %r", value)
        return None


def _apply_extracted_fields(po: PORecord, extracted: dict) -> None:
    """
    Map OCR-extracted fields onto the PORecord ORM object.

    - Date fields are coerced from string → date before assignment.
    - Only known, mappable fields are touched; unknown OCR keys are ignored.
    - The raw extracted dict is preserved separately in po.extracted_fields (JSONB).
    """
    for field, value in extracted.items():
        if field not in _MAPPABLE_FIELDS:
            continue
        if field in _DATE_FIELDS:
            value = _to_date(value)
        if value is not None:  # don't overwrite existing data with OCR nulls
            setattr(po, field, value)


# ── File storage ──────────────────────────────────────────────────────────────

async def upload_file_locally(file: UploadFile, folder: str = "ocr_uploads") -> str:
    content = await file.read()
    dest = UPLOAD_DIR / folder
    dest.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = dest / filename
    filepath.write_bytes(content)
    return str(filepath)


async def upload_file_to_s3(file: UploadFile, folder: str = "po_records") -> str:
    """Stub — delegates to local storage until S3 is wired up."""
    return await upload_file_locally(file, folder)


# ── DB helpers ────────────────────────────────────────────────────────────────

async def get_po_by_id(db: AsyncSession, po_id: uuid.UUID) -> PORecord | None:
    result = await db.execute(select(PORecord).where(PORecord.id == po_id))
    return result.scalar_one_or_none()


async def get_po_by_number(db: AsyncSession, po_number: str) -> PORecord | None:
    result = await db.execute(select(PORecord).where(PORecord.po_number == po_number))
    return result.scalar_one_or_none()


async def list_pos(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    payment_status: str | None = None,
    buyer_name: str | None = None,
):
    query = select(PORecord)
    if status:
        query = query.where(PORecord.status == status)
    if payment_status:
        query = query.where(PORecord.payment_status == payment_status)
    if buyer_name:
        query = query.where(PORecord.buyer_name.ilike(f"%{buyer_name}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = (
        query.order_by(PORecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(query)).scalars().all()
    return list(rows), total


# ── Core upload + OCR flow ────────────────────────────────────────────────────

async def process_po_upload(db: AsyncSession, po: PORecord, file: UploadFile) -> PORecord:
    """
    1. Save the file locally.
    2. Mark PO as 'processing' and persist.
    3. Run Gemini OCR via extract_document().
    4. Coerce date strings → date objects, then map onto PO columns.
    5. Store raw OCR output in extracted_fields (JSONB).
    6. Mark PO as 'extracted' and persist.
    """
    # 1. Save file
    file_url = await upload_file_locally(file, "ocr_uploads")
    po.file_url = file_url
    po.status = "processing"
    await db.commit()
    await db.refresh(po)

    # 2. Re-read bytes for OCR (cursor was consumed by upload_file_locally)
    await file.seek(0)
    content = await file.read()

    # 3. Call Gemini OCR
    extracted: dict = await extract_document(
        image_bytes=content,
        mime_type=file.content_type or "image/jpeg",
        doc_type=DocType.PO,
    )

    # 4. Map OCR fields onto typed ORM columns (dates coerced inside helper)
    _apply_extracted_fields(po, extracted)

    # 5. Store raw OCR output in JSONB (strings preserved for audit trail)
    po.extracted_fields = extracted
    po.status = "extracted"
    po.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(po)
    return po
