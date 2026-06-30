"""
app/routers/notifications.py

GET    /notifications              — list current user's notifications (own + role broadcasts)
PATCH  /notifications/{id}/read    — mark one as read
POST   /notifications/read-all     — mark all of current user's notifications as read
DELETE /notifications/{id}         — clear one notification

Also exports create_notification(), a helper other routers call to insert
a notification and push it over WebSocket in real time.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.dependencies import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut], summary="List my notifications")
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Returns notifications targeted directly at this user, plus any
    broadcast to their role — newest first.
    """
    result = await db.execute(
        select(Notification)
        .where(
            or_(
                Notification.user_id == user.id,
                Notification.target_role == user.role,
            )
        )
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.patch("/{notification_id}/read", response_model=NotificationOut, summary="Mark one as read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    # Only allow marking read if it's actually addressed to this user
    if notif.user_id != user.id and notif.target_role != user.role:
        raise HTTPException(status_code=403, detail="Not your notification")

    notif.read = True
    await db.commit()
    await db.refresh(notif)
    return notif


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT, summary="Mark all my notifications as read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(
            or_(
                Notification.user_id == user.id,
                Notification.target_role == user.role,
            )
        )
        .values(read=True)
    )
    await db.commit()


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Clear one notification")
async def delete_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.user_id != user.id and notif.target_role != user.role:
        raise HTTPException(status_code=403, detail="Not your notification")

    await db.delete(notif)
    await db.commit()


# ── Helper for other routers to call ────────────────────────────────────────
async def create_notification(
    *,
    title: str,
    message: str,
    type: str = "info",
    category: str = "system",
    user_id: Optional[uuid.UUID] = None,
    target_role: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> Notification:
    """
    Insert a new notification and push it to connected WebSocket clients.

    Pass exactly one of user_id (targets one person) or target_role
    (broadcasts to everyone with that role) — never both, never neither.

    If `db` is not provided, opens its own short-lived session — useful
    when calling from background tasks that don't already have a session.
    """
    if (user_id is None) == (target_role is None):
        raise ValueError("Provide exactly one of user_id or target_role")

    owns_session = db is None
    if owns_session:
        db = async_session()

    try:
        notif = Notification(
            title=title,
            message=message,
            type=type,
            category=category,
            user_id=user_id,
            target_role=target_role,
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)

        # Push over WebSocket — imported here to avoid a circular import
        # (notifications_ws imports this module's router for auth deps)
        from app.routers.notifications_ws import push_notification
        await push_notification(notif)

        return notif
    finally:
        if owns_session:
            await db.close()
