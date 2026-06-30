"""
app/dependencies.py
Reusable FastAPI dependencies injected via Depends().

Usage in a router:
    @router.get("/me")
    async def me(current_user: User = Depends(get_current_user)):
        ...

    @router.delete("/{id}")
    async def delete(
        id: UUID,
        db: AsyncSession = Depends(get_db),
        _: User = Depends(require_roles("system_admin", "trade_manager")),
    ):
        ...
"""
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.core.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


# ── Database session ───────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session and close it when done."""
    async with async_session() as session:
        yield session


# ── Current user from JWT ──────────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract the Bearer token, validate it, and return the User row.
    Raises 401 if missing / invalid / user not found or inactive.
    """
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


# ── Role guard factory ─────────────────────────────────────────────────────────
def require_roles(*roles: str):
    """
    Returns a dependency that checks the current user has one of the given roles.

    Example:
        Depends(require_roles("system_admin", "trade_manager"))
    """
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(roles)}",
            )
        return current_user
    return _check


# ── Convenience shortcuts ──────────────────────────────────────────────────────
AdminOnly = Depends(require_roles("system_admin"))
AdminOrManager = Depends(require_roles("system_admin", "trade_manager"))
AnyStaff = Depends(get_current_user)   # just needs to be logged in
