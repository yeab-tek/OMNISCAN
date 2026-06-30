"""
app/models/bill_of_lading.py
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey

from app.core.database import Base

DocStatusEnum = Enum(
    "uploaded", "processing", "extracted", "approved", "rejected",
    name="doc_status_enum", create_type=False,
)


class BillOfLading(Base):
    __tablename__ = "bills_of_lading"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("po_records.id", ondelete="CASCADE"), nullable=False, index=True)

    bl_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    bl_date: Mapped[date | None] = mapped_column(Date)
    shipper_name: Mapped[str | None] = mapped_column(String(255))
    consignee_name: Mapped[str | None] = mapped_column(String(255))
    carrier_name: Mapped[str | None] = mapped_column(String(255))

    origin_port: Mapped[str | None] = mapped_column(String(100))
    destination_port: Mapped[str | None] = mapped_column(String(100))
    vessel_name: Mapped[str | None] = mapped_column(String(150))
    voyage_number: Mapped[str | None] = mapped_column(String(50))
    container_number: Mapped[str | None] = mapped_column(String(100))

    file_url: Mapped[str | None] = mapped_column(Text)
    extracted_fields: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(DocStatusEnum, nullable=False, default="uploaded")
    version_number: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    po_record: Mapped["PORecord"] = relationship(back_populates="bills_of_lading")  # noqa: F821
