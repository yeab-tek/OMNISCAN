"""
app/routers/packing_lists.py
"""
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_roles
from app.models.packing_list import PackingList
from app.models.user import User
from app.schemas.documents import PackingListCreate, PackingListOut, PackingListUpdate
from app.services.ocr_service import DocType, extract_document
from app.services.po_service import upload_file_to_s3

router = APIRouter(prefix="/packing-lists", tags=["Packing Lists"])
ALLOWED = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


@router.get("", response_model=list[PackingListOut])
async def list_pls(po_record_id: uuid.UUID | None = Query(None), db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    q = select(PackingList)
    if po_record_id:
        q = q.where(PackingList.po_record_id == po_record_id)
    return (await db.execute(q.order_by(PackingList.created_at.desc()))).scalars().all()


@router.post("", response_model=PackingListOut, status_code=201)
async def create_pl(body: PackingListCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = PackingList(**body.model_dump(), uploaded_by=current_user.id)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{doc_id}", response_model=PackingListOut)
async def get_pl(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(PackingList, doc_id)
    if not obj:
        raise HTTPException(404, "Not found")
    return obj


@router.patch("/{doc_id}", response_model=PackingListOut)
async def update_pl(doc_id: uuid.UUID, body: PackingListUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(PackingList, doc_id)
    if not obj:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{doc_id}", status_code=204)
async def delete_pl(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(require_roles("system_admin"))):
    obj = await db.get(PackingList, doc_id)
    if not obj:
        raise HTTPException(404, "Not found")
    await db.delete(obj)
    await db.commit()


@router.post("/{doc_id}/upload", response_model=PackingListOut)
async def upload_pl_file(doc_id: uuid.UUID, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")
    obj = await db.get(PackingList, doc_id)
    if not obj:
        raise HTTPException(404, "Not found")
    if obj.file_url:
        obj.version_number += 1
    obj.file_url = await upload_file_to_s3(file, "packing_lists")
    obj.status = "processing"
    await db.commit()
    await file.seek(0)
    content = await file.read()
    obj.extracted_fields = await extract_document(content, file.content_type, DocType.PACKING_LIST)
    obj.status = "extracted"
    await db.commit()
    await db.refresh(obj)
    return obj
