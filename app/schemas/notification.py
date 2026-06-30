"""
app/schemas/notification.py
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"
    category: str = "system"
    user_id: Optional[UUID] = None
    target_role: Optional[str] = None


class NotificationOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    target_role: Optional[str] = None
    title: str
    message: str
    type: str
    category: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
