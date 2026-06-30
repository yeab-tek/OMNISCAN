"""
app/models/commercial_invoice.py
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Numeric, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum, ForeignKey

from app.core.database import Base

DocStatusEnum = Enum(
    "uploaded", "processing", "extracted", "approved", "rejected",
    name="doc_status_enum", create_type=False,
)


class CommercialInvoice(Base):
    __tablename__ = "commercial_invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("po_records.id", ondelete="CASCADE"), nullable=False, index=True)

    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    invoice_date: Mapped[date | None] = mapped_column(Date)
    buyer_name: Mapped[str | None] = mapped_column(String(255))
    seller_name: Mapped[str | None] = mapped_column(String(255), default="LATA AGRI EXPORT")

    total_amount: Mapped[float | None] = mapped_column(Numeric(15, 4))
    currency: Mapped[str | None] = mapped_column(String(10), default="USD")
    payment_terms: Mapped[str | None] = mapped_column(String(255))

    file_url: Mapped[str | None] = mapped_column(Text)
    extracted_fields: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(DocStatusEnum, nullable=False, default="uploaded")
    version_number: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    po_record: Mapped["PORecord"] = relationship(back_populates="commercial_invoices")  # noqa: F821
