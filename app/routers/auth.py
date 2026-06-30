"""
app/routers/auth.py
POST /auth/login  — returns JWT
GET  /auth/me     — returns current user info
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.dependencies import get_current_user, get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, summary="Login and receive JWT")
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with email + password.
    Returns a Bearer token valid for ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Update last_login
    await db.execute(
        update(User).where(User.id == user.id).values(last_login=datetime.utcnow())
    )

    # Write to audit_log
    db.add(AuditLog(
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        action="login",
        table_name="users",
        record_id=user.id,
        record_ref=user.email,
        ip_address=request.client.host if request.client else None,
    ))
    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut, summary="Get current user profile")
async def me(current_user: User = Depends(get_current_user)):
    return current_user
