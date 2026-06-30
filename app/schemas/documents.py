"""
app/schemas/documents.py
Schemas for CommercialInvoice, BillOfLading, PackingList, TradeCertificate,
AuditLog, and Dashboard views.
"""
from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


# ── Commercial Invoice ─────────────────────────────────────────────────────────
class CommercialInvoiceCreate(BaseModel):
    po_record_id: UUID
    invoice_number: str
    invoice_date: Optional[date] = None
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = "LATA AGRI EXPORT"
    total_amount: Optional[float] = None
    currency: Optional[str] = "USD"
    payment_terms: Optional[str] = None


class CommercialInvoiceUpdate(BaseModel):
    invoice_date: Optional[date] = None
    buyer_name: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = None
    status: Optional[str] = None


class CommercialInvoiceOut(CommercialInvoiceCreate):
    id: UUID
    file_url: Optional[str] = None
    extracted_fields: Optional[Any] = None
    status: str
    version_number: int
    uploaded_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Bill of Lading ─────────────────────────────────────────────────────────────
class BillOfLadingCreate(BaseModel):
    po_record_id: UUID
    bl_number: str
    bl_date: Optional[date] = None
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None
    carrier_name: Optional[str] = None
    origin_port: Optional[str] = None
    destination_port: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_number: Optional[str] = None
    container_number: Optional[str] = None


class BillOfLadingUpdate(BaseModel):
    bl_date: Optional[date] = None
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None
    carrier_name: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_number: Optional[str] = None
    container_number: Optional[str] = None
    status: Optional[str] = None


class BillOfLadingOut(BillOfLadingCreate):
    id: UUID
    file_url: Optional[str] = None
    extracted_fields: Optional[Any] = None
    status: str
    version_number: int
    uploaded_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Packing List ───────────────────────────────────────────────────────────────
class PackingListCreate(BaseModel):
    po_record_id: UUID
    pl_number: Optional[str] = None
    pl_date: Optional[date] = None
    prepared_by: Optional[str] = "LATA AGRI EXPORT"
    total_bags: Optional[int] = None
    total_weight_kg: Optional[float] = None
    product_description: Optional[str] = None


class PackingListUpdate(BaseModel):
    pl_date: Optional[date] = None
    total_bags: Optional[int] = None
    total_weight_kg: Optional[float] = None
    product_description: Optional[str] = None
    status: Optional[str] = None


class PackingListOut(PackingListCreate):
    id: UUID
    file_url: Optional[str] = None
    extracted_fields: Optional[Any] = None
    status: str
    version_number: int
    uploaded_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Trade Certificate ──────────────────────────────────────────────────────────
class TradeCertificateCreate(BaseModel):
    po_record_id: UUID
    certificate_type: str
    certificate_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issued_by: Optional[str] = None


class TradeCertificateUpdate(BaseModel):
    certificate_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issued_by: Optional[str] = None
    status: Optional[str] = None


class TradeCertificateOut(TradeCertificateCreate):
    id: UUID
    file_url: Optional[str] = None
    extracted_fields: Optional[Any] = None
    status: str
    version_number: int
    uploaded_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Audit Log ──────────────────────────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    table_name: str
    record_id: Optional[UUID] = None
    record_ref: Optional[str] = None
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime

    @field_validator("ip_address", mode="before")
    @classmethod
    def coerce_ip_address(cls, v):
        """asyncpg returns INET columns as IPv4Address/IPv6Address objects,
        not strings — convert them so Pydantic validation doesn't reject them."""
        return str(v) if v is not None else None

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    """Paginated wrapper returned by GET /dashboard/audit-log."""
    items: list[AuditLogOut]
    total: int
    page: int
    limit: int


# ── Dashboard ──────────────────────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    total_pos: int
    active_pos: int
    pending_payments: int
    overdue_payments: int
    samples_pending: int
    eudr_issues: int
    due_in_14_days: int
    due_in_3_days: int


class UpcomingDeadline(BaseModel):
    id: UUID
    po_number: str
    buyer_name: Optional[str]
    shipment_start: Optional[date]
    shipment_end: Optional[date]
    payment_status: str
    sample_required: bool
    sample_sent: bool
    days_until_shipment: Optional[int]
    owner_email: str
    owner_name: str

    model_config = {"from_attributes": True}