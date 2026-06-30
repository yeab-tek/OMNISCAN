"""
app/models/trade_certificate.py
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
CertTypeEnum = Enum(
    "certificate_of_origin", "phytosanitary_certificate", "quality_certificate",
    "fumigation_certificate", "weight_certificate", "eudr_declaration", "other",
    name="certificate_type_enum", create_type=False,
)


class TradeCertificate(Base):
    __tablename__ = "trade_certificates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("po_records.id", ondelete="CASCADE"), nullable=False, index=True)

    certificate_type: Mapped[str] = mapped_column(CertTypeEnum, nullable=False, index=True)
    certificate_number: Mapped[str | None] = mapped_column(String(100))
    issue_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    issued_by: Mapped[str | None] = mapped_column(String(255))

    file_url: Mapped[str | None] = mapped_column(Text)
    extracted_fields: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(DocStatusEnum, nullable=False, default="uploaded")
    version_number: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    po_record: Mapped["PORecord"] = relationship(back_populates="trade_certificates")  # noqa: F821
