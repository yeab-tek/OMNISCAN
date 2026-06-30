"""
app/routers/ocr.py
OCR upload endpoint — accepts any trade document, runs Groq OCR,
returns a job_id that the frontend polls for results.

Non-PO documents (commercial invoice, bill of lading, packing list,
trade certificate) all require a po_record_id (NOT NULL FK). The flow:

  1. Frontend may pass po_record_id directly if the user already picked
     one from a dropdown.
  2. If not provided, we try to auto-match using the "po_number" field
     the OCR prompt was asked to extract from the document text.
  3. If no match is found, the job comes back with status="needs_po"
     so the frontend can prompt the user to pick a PO manually before
     the record is actually persisted.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.po_record import PORecord
from app.models.commercial_invoice import CommercialInvoice
from app.models.bill_of_lading import BillOfLading
from app.models.packing_list import PackingList
from app.models.trade_certificate import TradeCertificate
from app.models.user import User
from app.services.ocr_service import DocType, extract_document
from app.services.po_service import upload_file_locally, _to_date, get_po_by_number

router = APIRouter(prefix="/ocr", tags=["OCR"])

# In-memory job store (simple, no Redis needed)
_jobs: dict[str, dict] = {}

ALLOWED = {"image/jpeg", "image/png", "image/webp", "application/pdf"}

DOC_TYPE_MAP = {
    "po_record":           DocType.PO,
    "commercial_invoice":  DocType.INVOICE,
    "bill_of_lading":      DocType.BL,
    "packing_list":        DocType.PACKING_LIST,
    "trade_certificate":   DocType.CERTIFICATE,
}


async def _save_po_record(db: AsyncSession, extracted: dict, file_url: str, job_id: str, current_user: User):
    """Existing PO-record save/upsert logic."""
    po_number = extracted.get("po_number") or f"OCR-{job_id[:8].upper()}"
    existing = (
        await db.execute(select(PORecord).where(PORecord.po_number == po_number))
    ).scalar_one_or_none()

    if not existing:
        po = PORecord(
            po_number=po_number,
            po_date=_to_date(extracted.get("po_date")),
            buyer_name=extracted.get("buyer_name"),
            buyer_country=extracted.get("buyer_country"),
            quantity_bags=extracted.get("quantity_bags"),
            bag_weight_kg=extracted.get("bag_weight_kg"),
            quality_description=extracted.get("quality_description"),
            crop_year=extracted.get("crop_year"),
            price_per_unit=extracted.get("price_per_unit"),
            price_currency=extracted.get("price_currency") or "USD",
            incoterms=extracted.get("incoterms"),
            shipment_start=_to_date(extracted.get("shipment_start")),
            shipment_end=_to_date(extracted.get("shipment_end")),
            origin_port=extracted.get("origin_port"),
            destination_port=extracted.get("destination_port"),
            payment_terms=extracted.get("payment_terms"),
            file_url=file_url,
            extracted_fields=extracted,
            status="extracted",
            uploaded_by=current_user.id,
        )
        db.add(po)
    else:
        existing.po_date          = _to_date(extracted.get("po_date"))
        existing.buyer_name       = extracted.get("buyer_name")
        existing.buyer_country    = extracted.get("buyer_country")
        existing.quantity_bags    = extracted.get("quantity_bags")
        existing.bag_weight_kg    = extracted.get("bag_weight_kg")
        existing.quality_description = extracted.get("quality_description")
        existing.crop_year        = extracted.get("crop_year")
        existing.price_per_unit   = extracted.get("price_per_unit")
        existing.price_currency   = extracted.get("price_currency") or "USD"
        existing.incoterms        = extracted.get("incoterms")
        existing.shipment_start   = _to_date(extracted.get("shipment_start"))
        existing.shipment_end     = _to_date(extracted.get("shipment_end"))
        existing.origin_port      = extracted.get("origin_port")
        existing.destination_port = extracted.get("destination_port")
        existing.payment_terms    = extracted.get("payment_terms")
        existing.file_url         = file_url
        existing.extracted_fields = extracted
        existing.status           = "extracted"
        existing.version_number  += 1
        existing.updated_at       = datetime.utcnow()

    await db.commit()


async def _save_commercial_invoice(db, extracted: dict, file_url: str, po_record_id: uuid.UUID, current_user: User):
    invoice_number = extracted.get("invoice_number") or f"INV-{uuid.uuid4().hex[:8].upper()}"
    existing = (
        await db.execute(select(CommercialInvoice).where(CommercialInvoice.invoice_number == invoice_number))
    ).scalar_one_or_none()

    if existing:
        existing.invoice_date  = _to_date(extracted.get("invoice_date"))
        existing.buyer_name    = extracted.get("buyer_name")
        existing.seller_name   = extracted.get("seller_name") or "LATA AGRI EXPORT"
        existing.total_amount  = extracted.get("total_amount")
        existing.currency      = extracted.get("currency") or "USD"
        existing.payment_terms = extracted.get("payment_terms")
        existing.file_url      = file_url
        existing.extracted_fields = extracted
        existing.status        = "extracted"
        existing.version_number += 1
        existing.updated_at     = datetime.utcnow()
    else:
        db.add(CommercialInvoice(
            po_record_id=po_record_id,
            invoice_number=invoice_number,
            invoice_date=_to_date(extracted.get("invoice_date")),
            buyer_name=extracted.get("buyer_name"),
            seller_name=extracted.get("seller_name") or "LATA AGRI EXPORT",
            total_amount=extracted.get("total_amount"),
            currency=extracted.get("currency") or "USD",
            payment_terms=extracted.get("payment_terms"),
            file_url=file_url,
            extracted_fields=extracted,
            status="extracted",
            uploaded_by=current_user.id,
        ))
    await db.commit()


async def _save_bill_of_lading(db, extracted: dict, file_url: str, po_record_id: uuid.UUID, current_user: User):
    bl_number = extracted.get("bl_number") or f"BL-{uuid.uuid4().hex[:8].upper()}"
    existing = (
        await db.execute(select(BillOfLading).where(BillOfLading.bl_number == bl_number))
    ).scalar_one_or_none()

    if existing:
        existing.bl_date          = _to_date(extracted.get("bl_date"))
        existing.shipper_name     = extracted.get("shipper_name")
        existing.consignee_name   = extracted.get("consignee_name")
        existing.carrier_name     = extracted.get("carrier_name")
        existing.origin_port      = extracted.get("origin_port")
        existing.destination_port = extracted.get("destination_port")
        existing.vessel_name      = extracted.get("vessel_name")
        existing.voyage_number    = extracted.get("voyage_number")
        existing.container_number = extracted.get("container_number")
        existing.file_url         = file_url
        existing.extracted_fields = extracted
        existing.status           = "extracted"
        existing.version_number  += 1
        existing.updated_at       = datetime.utcnow()
    else:
        db.add(BillOfLading(
            po_record_id=po_record_id,
            bl_number=bl_number,
            bl_date=_to_date(extracted.get("bl_date")),
            shipper_name=extracted.get("shipper_name"),
            consignee_name=extracted.get("consignee_name"),
            carrier_name=extracted.get("carrier_name"),
            origin_port=extracted.get("origin_port"),
            destination_port=extracted.get("destination_port"),
            vessel_name=extracted.get("vessel_name"),
            voyage_number=extracted.get("voyage_number"),
            container_number=extracted.get("container_number"),
            file_url=file_url,
            extracted_fields=extracted,
            status="extracted",
            uploaded_by=current_user.id,
        ))
    await db.commit()


async def _save_packing_list(db, extracted: dict, file_url: str, po_record_id: uuid.UUID, current_user: User):
    pl_number = extracted.get("pl_number") or f"PL-{uuid.uuid4().hex[:8].upper()}"
    existing = (
        await db.execute(select(PackingList).where(PackingList.pl_number == pl_number))
    ).scalar_one_or_none()

    if existing:
        existing.pl_date             = _to_date(extracted.get("pl_date"))
        existing.total_bags          = extracted.get("total_bags")
        existing.total_weight_kg     = extracted.get("total_weight_kg")
        existing.product_description = extracted.get("product_description")
        existing.file_url            = file_url
        existing.extracted_fields    = extracted
        existing.status              = "extracted"
        existing.version_number     += 1
        existing.updated_at          = datetime.utcnow()
    else:
        db.add(PackingList(
            po_record_id=po_record_id,
            pl_number=pl_number,
            pl_date=_to_date(extracted.get("pl_date")),
            total_bags=extracted.get("total_bags"),
            total_weight_kg=extracted.get("total_weight_kg"),
            product_description=extracted.get("product_description"),
            file_url=file_url,
            extracted_fields=extracted,
            status="extracted",
            uploaded_by=current_user.id,
        ))
    await db.commit()


async def _save_trade_certificate(db, extracted: dict, file_url: str, po_record_id: uuid.UUID, current_user: User):
    certificate_number = extracted.get("certificate_number") or f"CERT-{uuid.uuid4().hex[:8].upper()}"
    existing = (
        await db.execute(select(TradeCertificate).where(TradeCertificate.certificate_number == certificate_number))
    ).scalar_one_or_none()

    cert_type = extracted.get("certificate_type") or "other"

    if existing:
        existing.certificate_type = cert_type
        existing.issue_date       = _to_date(extracted.get("issue_date"))
        existing.expiry_date      = _to_date(extracted.get("expiry_date"))
        existing.issued_by        = extracted.get("issued_by")
        existing.file_url         = file_url
        existing.extracted_fields = extracted
        existing.status           = "extracted"
        existing.version_number  += 1
        existing.updated_at       = datetime.utcnow()
    else:
        db.add(TradeCertificate(
            po_record_id=po_record_id,
            certificate_type=cert_type,
            certificate_number=certificate_number,
            issue_date=_to_date(extracted.get("issue_date")),
            expiry_date=_to_date(extracted.get("expiry_date")),
            issued_by=extracted.get("issued_by"),
            file_url=file_url,
            extracted_fields=extracted,
            status="extracted",
            uploaded_by=current_user.id,
        ))
    await db.commit()


@router.post("/upload", summary="Upload document and start OCR job")
async def upload_and_ocr(
    file: UploadFile = File(...),
    doc_type: str = Form("po_record"),
    po_record_id: str | None = Form(None, description="Existing PO id this document belongs to (required for non-PO doc types unless auto-matched)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": "processing",
        "confidence": None,
        "extracted_fields": None,
        "file_url": None,
        "doc_type": doc_type,
    }

    try:
        # Upload file locally
        file_url = await upload_file_locally(file, "ocr_uploads")

        # Re-read bytes for OCR (stream consumed by upload)
        await file.seek(0)
        content = await file.read()

        # Run Groq OCR
        groq_doc_type = DOC_TYPE_MAP.get(doc_type, DocType.PO)
        extracted = await extract_document(content, file.content_type or "image/jpeg", groq_doc_type)

        if not extracted or "_error" in extracted:
            confidence = 0.0
            _jobs[job_id] = {
                "status": "done",
                "confidence": confidence,
                "extracted_fields": extracted,
                "file_url": file_url,
                "doc_type": doc_type,
            }
            return {"job_id": job_id}

        # ── PO records: existing standalone flow ──────────────────────────────
        if doc_type == "po_record":
            await _save_po_record(db, extracted, file_url, job_id, current_user)

        # ── Non-PO documents: require a po_record_id ───────────────────────────
        else:
            resolved_po_id: uuid.UUID | None = None

            if po_record_id:
                resolved_po_id = uuid.UUID(po_record_id)
            else:
                # Try auto-match using the po_number OCR was asked to extract
                extracted_po_number = extracted.get("po_number")
                if extracted_po_number:
                    matched_po = await get_po_by_number(db, extracted_po_number)
                    if matched_po:
                        resolved_po_id = matched_po.id

            if resolved_po_id is None:
                # Can't save yet — frontend must show a PO picker and retry
                # the upload with po_record_id set, or call /ocr/link.
                _jobs[job_id] = {
                    "status": "needs_po",
                    "confidence": 0.0,
                    "extracted_fields": extracted,
                    "file_url": file_url,
                    "doc_type": doc_type,
                    "suggested_po_number": extracted.get("po_number"),
                }
                return {"job_id": job_id}

            if doc_type == "commercial_invoice":
                await _save_commercial_invoice(db, extracted, file_url, resolved_po_id, current_user)
            elif doc_type == "bill_of_lading":
                await _save_bill_of_lading(db, extracted, file_url, resolved_po_id, current_user)
            elif doc_type == "packing_list":
                await _save_packing_list(db, extracted, file_url, resolved_po_id, current_user)
            elif doc_type == "trade_certificate":
                await _save_trade_certificate(db, extracted, file_url, resolved_po_id, current_user)

        confidence = 0.94
        _jobs[job_id] = {
            "status": "done",
            "confidence": confidence,
            "extracted_fields": extracted,
            "file_url": file_url,
            "doc_type": doc_type,
        }

    except Exception as e:
        _jobs[job_id] = {
            "status": "failed",
            "error": str(e),
            "confidence": 0,
            "extracted_fields": None,
            "file_url": None,
            "doc_type": doc_type,
        }

    return {"job_id": job_id}


@router.post("/link", summary="Manually link a previously-OCR'd non-PO document to a PO")
async def link_document_to_po(
    job_id: str = Form(...),
    po_record_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Used when /ocr/upload returned status="needs_po" — the frontend shows a
    PO picker, the user selects one, and we finish the save here using the
    already-extracted fields cached in the job store (no re-upload needed).
    """
    job = _jobs.get(job_id)
    if not job or job.get("status") != "needs_po":
        raise HTTPException(404, "Job not found or does not need a PO link")

    resolved_po_id = uuid.UUID(po_record_id)
    extracted = job["extracted_fields"] or {}
    file_url = job["file_url"]
    doc_type = job["doc_type"]

    if doc_type == "commercial_invoice":
        await _save_commercial_invoice(db, extracted, file_url, resolved_po_id, current_user)
    elif doc_type == "bill_of_lading":
        await _save_bill_of_lading(db, extracted, file_url, resolved_po_id, current_user)
    elif doc_type == "packing_list":
        await _save_packing_list(db, extracted, file_url, resolved_po_id, current_user)
    elif doc_type == "trade_certificate":
        await _save_trade_certificate(db, extracted, file_url, resolved_po_id, current_user)
    else:
        raise HTTPException(400, f"Cannot link doc_type '{doc_type}' to a PO")

    job["status"] = "done"
    job["confidence"] = 0.94
    return {"status": "done"}


@router.get("/status/{job_id}", summary="Poll OCR job status")
async def get_job_status(
    job_id: str,
    _: User = Depends(get_current_user),
):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job