"""
app/routers/po_records.py

GET    /po-records              — list (paginated, filterable)
GET    /po-records/lookup       — lightweight list for dropdowns (id + po_number + buyer)
POST   /po-records              — create PO record
GET    /po-records/{id}         — get one
PATCH  /po-records/{id}         — update fields
DELETE /po-records/{id}         — delete
POST   /po-records/{id}/upload  — upload file + trigger Gemini OCR
POST   /po-records/{id}/approve — mark as approved (trade manager+)
"""
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_roles
from app.models.po_record import PORecord
from app.models.user import User
from app.schemas.po_record import PORecordCreate, PORecordList, PORecordOut, PORecordUpdate
from app.services import po_service

router = APIRouter(prefix="/po-records", tags=["Purchase Orders"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


class POLookupItem(BaseModel):
    """Minimal shape for populating PO selector dropdowns on other doc types."""
    id: uuid.UUID
    po_number: str
    buyer_name: str | None = None

    model_config = {"from_attributes": True}


@router.get("", response_model=PORecordList, summary="List Purchase Orders (paginated)")
async def list_po_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    payment_status: str | None = Query(None),
    buyer_name: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = await po_service.list_pos(
        db, page=page, page_size=page_size,
        status=status_filter, payment_status=payment_status, buyer_name=buyer_name,
    )
    return PORecordList(total=total, page=page, page_size=page_size, items=items)


@router.get(
    "/lookup",
    response_model=list[POLookupItem],
    summary="Lightweight PO list for dropdowns (id + po_number + buyer only)",
)
async def lookup_po_records(
    search: str | None = Query(None, description="Filter by partial PO number"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(PORecord).order_by(PORecord.created_at.desc()).limit(limit)
    if search:
        query = query.where(PORecord.po_number.ilike(f"%{search}%"))
    rows = (await db.execute(query)).scalars().all()
    return rows


@router.post("", response_model=PORecordOut, status_code=status.HTTP_201_CREATED, summary="Create a PO")
async def create_po_record(
    body: PORecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prevent duplicate PO numbers
    existing = await po_service.get_po_by_number(db, body.po_number)
    if existing:
        raise HTTPException(status_code=400, detail=f"PO number '{body.po_number}' already exists")

    po = PORecord(**body.model_dump(), uploaded_by=current_user.id)
    db.add(po)
    await db.commit()
    await db.refresh(po)
    return po


@router.get("/{po_id}", response_model=PORecordOut, summary="Get a single PO")
async def get_po_record(
    po_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    po = await po_service.get_po_by_id(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    return po


@router.patch("/{po_id}", response_model=PORecordOut, summary="Update PO fields")
async def update_po_record(
    po_id: uuid.UUID,
    body: PORecordUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("system_admin", "trade_manager", "data_entry_operator")),
):
    po = await po_service.get_po_by_id(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(po, field, value)

    await db.commit()
    await db.refresh(po)
    return po


@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a PO")
async def delete_po_record(
    po_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("system_admin")),
):
    po = await po_service.get_po_by_id(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    await db.delete(po)
    await db.commit()


@router.post("/{po_id}/upload", response_model=PORecordOut, summary="Upload document file + run OCR")
async def upload_po_file(
    po_id: uuid.UUID,
    file: UploadFile = File(..., description="JPEG, PNG, WebP, or PDF scan of the PO"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a scan/image of the PO document.
    Automatically triggers Gemini OCR and stores extracted_fields.
    Sets status → 'extracted' when done (human review step is PATCH status=approved).
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    po = await po_service.get_po_by_id(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")

    # Bump version if re-uploading
    if po.file_url:
        po.version_number += 1

    updated_po = await po_service.process_po_upload(db, po, file)
    return updated_po


@router.post("/{po_id}/approve", response_model=PORecordOut, summary="Approve a PO after review")
async def approve_po(
    po_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("system_admin", "trade_manager")),
):
    po = await po_service.get_po_by_id(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")

    if po.status not in ("extracted", "uploaded"):
        raise HTTPException(status_code=400, detail=f"Cannot approve a PO with status '{po.status}'")

    po.status = "approved"
    await db.commit()
    await db.refresh(po)
    return po