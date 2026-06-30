"""
app/models/notification.py
SQLAlchemy ORM model for the `notifications` table.

A notification targets EITHER a specific user (user_id set) OR a role
(target_role set, broadcast to everyone with that role) — never both,
enforced by a DB-level CHECK constraint.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

NotificationTypeEnum = Enum(
    "info", "success", "warning", "error",
    name="notification_type_enum",
    create_type=False,  # already created by migration_add_notifications.sql
)

NotificationCategoryEnum = Enum(
    "shipment", "payment", "compliance", "system", "ocr",
    name="notification_category_enum",
    create_type=False,
)

# Reuses the same enum values as users.role — defined once in the DB as user_role_enum
UserRoleEnum = Enum(
    "system_admin", "trade_manager", "data_entry_operator", "finance_officer",
    name="user_role_enum",
    create_type=False,
)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Exactly one of these two is set — enforced by DB CHECK constraint
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    target_role: Mapped[str | None] = mapped_column(UserRoleEnum)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(NotificationTypeEnum, nullable=False, default="info")
    category: Mapped[str] = mapped_column(NotificationCategoryEnum, nullable=False, default="system")

    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
