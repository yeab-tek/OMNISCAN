"""
app/routers/dashboard.py

GET /dashboard/summary    — card counts from vw_dashboard_summary
GET /dashboard/deadlines  — upcoming shipments from vw_upcoming_deadlines
GET /dashboard/audit-log  — recent audit trail (admin only), paginated + filterable
"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.documents import (
    AuditLogListResponse,
    AuditLogOut,
    DashboardSummary,
    UpcomingDeadline,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary, summary="Dashboard summary card counts")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Reads from the vw_dashboard_summary database view."""
    result = await db.execute(text("SELECT * FROM vw_dashboard_summary"))
    row = result.mappings().one()
    return DashboardSummary(
        total_pos=row["total_pos"] or 0,
        active_pos=row["active_pos"] or 0,
        pending_payments=row["pending_payments"] or 0,
        overdue_payments=row["overdue_payments"] or 0,
        samples_pending=row["samples_pending"] or 0,
        eudr_issues=row["eudr_issues"] or 0,
        due_in_14_days=row["due_in_14_days"] or 0,
        due_in_3_days=row["due_in_3_days"] or 0,
    )


@router.get("/deadlines", response_model=list[UpcomingDeadline], summary="Upcoming shipment deadlines")
async def upcoming_deadlines(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Reads from vw_upcoming_deadlines — ordered by soonest shipment first."""
    result = await db.execute(
        text("SELECT * FROM vw_upcoming_deadlines LIMIT :lim"),
        {"lim": limit},
    )
    rows = result.mappings().all()
    return [
        UpcomingDeadline(
            id=r["id"],
            po_number=r["po_number"],
            buyer_name=r["buyer_name"],
            shipment_start=r["shipment_start"],
            shipment_end=r["shipment_end"],
            payment_status=r["payment_status"],
            sample_required=r["sample_required"],
            sample_sent=r["sample_sent"],
            days_until_shipment=r["days_until_shipment"],
            owner_email=r["owner_email"],
            owner_name=r["owner_name"],
        )
        for r in rows
    ]


@router.get(
    "/audit-log",
    response_model=AuditLogListResponse,
    summary="Recent audit trail (admin only)",
)
async def audit_log(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    table_name: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("system_admin")),
):
    """
    Returns a paginated, filterable list of audit log entries, newest first.

    Query params:
    - page: 1-indexed page number
    - limit: page size (max 500)
    - table_name: exact match on table_name
    - user_email: partial, case-insensitive match on user_email
    - action: exact match on action (create/update/delete/approve/reject/login/export)
    - from_date / to_date: inclusive date range filter on created_at
    """
    from app.models.audit_log import AuditLog

    # Build the shared WHERE conditions once, reuse for both count and page query
    conditions = []
    if table_name:
        conditions.append(AuditLog.table_name == table_name)
    if user_email:
        conditions.append(AuditLog.user_email.ilike(f"%{user_email}%"))
    if action:
        conditions.append(AuditLog.action == action)
    if from_date:
        conditions.append(AuditLog.created_at >= from_date)
    if to_date:
        conditions.append(AuditLog.created_at <= to_date)

    # Total count for pagination metadata
    count_q = select(func.count()).select_from(AuditLog)
    for cond in conditions:
        count_q = count_q.where(cond)
    total = (await db.execute(count_q)).scalar_one()

    # Page of results
    items_q = select(AuditLog).order_by(AuditLog.created_at.desc())
    for cond in conditions:
        items_q = items_q.where(cond)
    items_q = items_q.offset((page - 1) * limit).limit(limit)

    result = await db.execute(items_q)
    rows = result.scalars().all()

    return AuditLogListResponse(
        items=[AuditLogOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        limit=limit,
    )