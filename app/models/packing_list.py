"""
app/models/packing_list.py
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Integer, Numeric, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey

from app.core.database import Base

DocStatusEnum = Enum(
    "uploaded", "processing", "extracted", "approved", "rejected",
    name="doc_status_enum", create_type=False,
)


class PackingList(Base):
    __tablename__ = "packing_lists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("po_records.id", ondelete="CASCADE"), nullable=False, index=True)

    pl_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    pl_date: Mapped[date | None] = mapped_column(Date)
    prepared_by: Mapped[str | None] = mapped_column(String(255), default="LATA AGRI EXPORT")

    total_bags: Mapped[int | None] = mapped_column(Integer)
    total_weight_kg: Mapped[float | None] = mapped_column(Numeric(10, 2))
    product_description: Mapped[str | None] = mapped_column(Text)

    file_url: Mapped[str | None] = mapped_column(Text)
    extracted_fields: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(DocStatusEnum, nullable=False, default="uploaded")
    version_number: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    po_record: Mapped["PORecord"] = relationship(back_populates="packing_lists")  # noqa: F821
