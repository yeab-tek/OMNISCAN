"""
app/models/po_record.py
SQLAlchemy ORM model for the `po_records` table.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, Integer, Numeric,
    SmallInteger, String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey

from app.core.database import Base

DocStatusEnum = Enum(
    "uploaded", "processing", "extracted", "approved", "rejected",
    name="doc_status_enum", create_type=False,
)
PaymentStatusEnum = Enum(
    "pending", "received", "overdue",
    name="payment_status_enum", create_type=False,
)


class PORecord(Base):
    __tablename__ = "po_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core identifiers
    po_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    po_date: Mapped[date | None] = mapped_column(Date)

    # Buyer & Seller
    buyer_name: Mapped[str | None] = mapped_column(String(255))
    buyer_country: Mapped[str | None] = mapped_column(String(100))
    seller_name: Mapped[str | None] = mapped_column(String(255), default="LATA AGRI EXPORT")

    # Product
    quantity_bags: Mapped[int | None] = mapped_column(Integer)
    bag_weight_kg: Mapped[float | None] = mapped_column(Numeric(8, 2))
    quality_description: Mapped[str | None] = mapped_column(Text)
    crop_year: Mapped[str | None] = mapped_column(String(20))

    # Pricing
    price_per_unit: Mapped[float | None] = mapped_column(Numeric(12, 4))
    price_currency: Mapped[str | None] = mapped_column(String(10), default="USC")
    incoterms: Mapped[str | None] = mapped_column(String(100))

    # Shipment
    shipment_start: Mapped[date | None] = mapped_column(Date)
    shipment_end: Mapped[date | None] = mapped_column(Date)
    origin_port: Mapped[str | None] = mapped_column(String(100))
    destination_port: Mapped[str | None] = mapped_column(String(100))

    # Payment
    payment_terms: Mapped[str | None] = mapped_column(String(255))
    payment_status: Mapped[str] = mapped_column(PaymentStatusEnum, nullable=False, default="pending")

    # EUDR & samples
    eudr_compliant: Mapped[bool | None] = mapped_column(Boolean, default=None)
    sample_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sample_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # OCR / File
    file_url: Mapped[str | None] = mapped_column(Text)
    extracted_fields: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(DocStatusEnum, nullable=False, default="uploaded")
    version_number: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    # Ownership
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    uploader: Mapped["User"] = relationship(back_populates="po_records")  # noqa: F821
    commercial_invoices: Mapped[list["CommercialInvoice"]] = relationship(back_populates="po_record", cascade="all, delete-orphan")  # noqa: F821
    bills_of_lading: Mapped[list["BillOfLading"]] = relationship(back_populates="po_record", cascade="all, delete-orphan")  # noqa: F821
    packing_lists: Mapped[list["PackingList"]] = relationship(back_populates="po_record", cascade="all, delete-orphan")  # noqa: F821
    trade_certificates: Mapped[list["TradeCertificate"]] = relationship(back_populates="po_record", cascade="all, delete-orphan")  # noqa: F821
