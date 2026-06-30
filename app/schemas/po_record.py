"""
app/schemas/po_record.py
Pydantic models for Purchase Order request/response validation.
"""
from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


# ── Shared date validator (applied in both Create and Update schemas) ──────────

def _coerce_date(v: Any) -> date | None:
    """
    Accept:  date objects, 'YYYY-MM-DD' strings, None / empty string.
    Reject:  anything else → returns None (safe NULL rather than a crash).
    """
    if v is None or v == "":
        return None
    if isinstance(v, date):
        return v
    try:
        return datetime.strptime(str(v).strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


# ── Base ───────────────────────────────────────────────────────────────────────

class PORecordBase(BaseModel):
    po_number: str
    po_date: Optional[date] = None
    buyer_name: Optional[str] = None
    buyer_country: Optional[str] = None
    seller_name: Optional[str] = "LATA AGRI EXPORT"
    quantity_bags: Optional[int] = None
    bag_weight_kg: Optional[float] = None
    quality_description: Optional[str] = None
    crop_year: Optional[str] = None
    price_per_unit: Optional[float] = None
    price_currency: Optional[str] = "USD"
    incoterms: Optional[str] = None
    shipment_start: Optional[date] = None
    shipment_end: Optional[date] = None
    origin_port: Optional[str] = None
    destination_port: Optional[str] = None
    payment_terms: Optional[str] = None
    payment_status: Optional[str] = "pending"
    eudr_compliant: Optional[bool] = None
    sample_required: bool = False
    sample_sent: bool = False

    # Validate date fields before Pydantic's own type coercion runs.
    # This catches string inputs from both the API body and OCR dicts.
    @field_validator("po_date", "shipment_start", "shipment_end", mode="before")
    @classmethod
    def parse_dates(cls, v: Any) -> date | None:
        return _coerce_date(v)


# ── Create ─────────────────────────────────────────────────────────────────────

class PORecordCreate(PORecordBase):
    pass  # file_url is set by the upload handler, not supplied by the caller


# ── Update (all fields optional for PATCH) ────────────────────────────────────

class PORecordUpdate(BaseModel):
    po_date: Optional[date] = None
    buyer_name: Optional[str] = None
    buyer_country: Optional[str] = None
    quantity_bags: Optional[int] = None
    bag_weight_kg: Optional[float] = None
    quality_description: Optional[str] = None
    crop_year: Optional[str] = None
    price_per_unit: Optional[float] = None
    price_currency: Optional[str] = None
    incoterms: Optional[str] = None
    shipment_start: Optional[date] = None
    shipment_end: Optional[date] = None
    origin_port: Optional[str] = None
    destination_port: Optional[str] = None
    payment_terms: Optional[str] = None
    payment_status: Optional[str] = None
    eudr_compliant: Optional[bool] = None
    sample_required: Optional[bool] = None
    sample_sent: Optional[bool] = None
    status: Optional[str] = None

    @field_validator("po_date", "shipment_start", "shipment_end", mode="before")
    @classmethod
    def parse_dates(cls, v: Any) -> date | None:
        return _coerce_date(v)


# ── Read (response) ───────────────────────────────────────────────────────────

class PORecordOut(PORecordBase):
    id: UUID
    file_url: Optional[str] = None
    extracted_fields: Optional[Any] = None
    status: str
    version_number: int
    uploaded_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Paginated list ─────────────────────────────────────────────────────────────

class PORecordList(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[PORecordOut]
