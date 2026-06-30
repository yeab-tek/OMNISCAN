"""
app/schemas/user.py
Pydantic models for user request/response validation.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ── Shared base ────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "data_entry_operator"
    phone_number: Optional[str] = None
    is_active: bool = True


# ── Create (incoming) ─────────────────────────────────────────────────────────
class UserCreate(UserBase):
    password: str   # plain text — hashed before storing


# ── Update (PATCH — all fields optional) ──────────────────────────────────────
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ── Response (outgoing — never exposes password_hash) ─────────────────────────
class UserOut(UserBase):
    id: UUID
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Auth ───────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
