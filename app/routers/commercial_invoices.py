"""
app/routers/commercial_invoices.py
GET    /commercial-invoices              — list
POST   /commercial-invoices              — create
GET    /commercial-invoices/{id}         — get one
PATCH  /commercial-invoices/{id}         — update
DELETE /commercial-invoices/{id}         — delete
POST   /commercial-invoices/{id}/upload  — upload + OCR
"""
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_roles
from app.models.commercial_invoice import CommercialInvoice
from app.models.user import User
from app.schemas.documents import CommercialInvoiceCreate, CommercialInvoiceOut, CommercialInvoiceUpdate
from app.services.ocr_service import DocType, extract_document
from app.services.po_service import upload_file_to_s3

router = APIRouter(prefix="/commercial-invoices", tags=["Commercial Invoices"])
ALLOWED = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


@router.get("", response_model=list[CommercialInvoiceOut])
async def list_invoices(
    po_record_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(CommercialInvoice)
    if po_record_id:
        q = q.where(CommercialInvoice.po_record_id == po_record_id)
    result = await db.execute(q.order_by(CommercialInvoice.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=CommercialInvoiceOut, status_code=201)
async def create_invoice(
    body: CommercialInvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = CommercialInvoice(**body.model_dump(), uploaded_by=current_user.id)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{doc_id}", response_model=CommercialInvoiceOut)
async def get_invoice(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    r = await db.get(CommercialInvoice, doc_id)
    if not r:
        raise HTTPException(404, "Not found")
    return r


@router.patch("/{doc_id}", response_model=CommercialInvoiceOut)
async def update_invoice(doc_id: uuid.UUID, body: CommercialInvoiceUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(CommercialInvoice, doc_id)
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{doc_id}", status_code=204)
async def delete_invoice(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(require_roles("system_admin"))):
    obj = await db.get(CommercialInvoice, doc_id)
    if not obj:
        raise HTTPException(404, "Not found")
    await db.delete(obj)
    await db.commit()


@router.post("/{doc_id}/upload", response_model=CommercialInvoiceOut)
async def upload_invoice_file(
    doc_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")
    obj = await db.get(CommercialInvoice, doc_id)
    if not obj:
        raise HTTPException(404, "Not found")
    if obj.file_url:
        obj.version_number += 1
    obj.file_url = await upload_file_to_s3(file, "commercial_invoices")
    obj.status = "processing"
    await db.commit()
    await file.seek(0)
    content = await file.read()
    obj.extracted_fields = await extract_document(content, file.content_type, DocType.INVOICE)
    obj.status = "extracted"
    await db.commit()
    await db.refresh(obj)
    return obj
