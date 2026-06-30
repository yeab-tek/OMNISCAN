"""
app/services/ocr_service.py
Groq Vision OCR — extracts structured fields from uploaded trade documents.
"""
import io
import json
import logging
import base64
from enum import Enum
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)

client = Groq(api_key=settings.GROQ_API_KEY)


class DocType(str, Enum):
    PO = "purchase_order"
    INVOICE = "commercial_invoice"
    BL = "bill_of_lading"
    PACKING_LIST = "packing_list"
    CERTIFICATE = "trade_certificate"


# NOTE: every non-PO prompt now includes "po_number" so the OCR result can be
# matched against an existing PORecord (po_record_id is a required FK on all
# of these tables). The model should look for a PO reference printed anywhere
# on the document — often labelled "PO No.", "Order Ref.", "P/O #", etc.
_PROMPTS: dict[DocType, str] = {
    DocType.PO: """Extract ALL fields from this Purchase Order image.
Respond ONLY with valid JSON, no markdown.
{
  "po_number": "",
  "po_date": "YYYY-MM-DD or null",
  "buyer_name": "",
  "buyer_country": "",
  "quantity_bags": 0,
  "bag_weight_kg": 0.0,
  "quality_description": "",
  "crop_year": "",
  "price_per_unit": 0.0,
  "price_currency": "",
  "incoterms": "",
  "shipment_start": "YYYY-MM-DD or null",
  "shipment_end": "YYYY-MM-DD or null",
  "origin_port": "",
  "destination_port": "",
  "payment_terms": ""
}""",
    DocType.INVOICE: """Extract fields from this Commercial Invoice.
Look for a Purchase Order reference number printed on the document
(often labelled "PO No.", "P/O #", "Order Ref.", "Against PO") and
put it in "po_number". If none is visible, use null.
Respond ONLY with valid JSON.
{
  "po_number": "YYYY or string or null",
  "invoice_number": "",
  "invoice_date": "YYYY-MM-DD or null",
  "buyer_name": "",
  "seller_name": "",
  "total_amount": 0.0,
  "currency": "",
  "payment_terms": ""
}""",
    DocType.BL: """Extract fields from this Bill of Lading.
Look for a Purchase Order reference number printed on the document
(often labelled "PO No.", "P/O #", "Order Ref.") and put it in
"po_number". If none is visible, use null.
Respond ONLY with valid JSON.
{
  "po_number": "string or null",
  "bl_number": "",
  "bl_date": "YYYY-MM-DD or null",
  "shipper_name": "",
  "consignee_name": "",
  "carrier_name": "",
  "origin_port": "",
  "destination_port": "",
  "vessel_name": "",
  "voyage_number": "",
  "container_number": ""
}""",
    DocType.PACKING_LIST: """Extract fields from this Packing List.
Look for a Purchase Order reference number printed on the document
(often labelled "PO No.", "P/O #", "Order Ref.") and put it in
"po_number". If none is visible, use null.
Respond ONLY with valid JSON.
{
  "po_number": "string or null",
  "pl_number": "",
  "pl_date": "YYYY-MM-DD or null",
  "total_bags": 0,
  "total_weight_kg": 0.0,
  "product_description": ""
}""",
    DocType.CERTIFICATE: """Extract fields from this trade certificate.
Look for a Purchase Order reference number printed on the document
(often labelled "PO No.", "P/O #", "Order Ref.") and put it in
"po_number". If none is visible, use null.
Respond ONLY with valid JSON.
{
  "po_number": "string or null",
  "certificate_type": "certificate_of_origin | phytosanitary_certificate | quality_certificate | fumigation_certificate | weight_certificate | eudr_declaration | other",
  "certificate_number": "",
  "issue_date": "YYYY-MM-DD or null",
  "expiry_date": "YYYY-MM-DD or null",
  "issued_by": ""
}""",
}


def _pdf_to_image(pdf_bytes: bytes) -> bytes:
    """Convert first page of PDF to JPEG bytes using PyMuPDF (no Poppler needed)."""
    import fitz  # PyMuPDF
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    mat = fitz.Matrix(2.0, 2.0)  # 2x zoom = ~144 DPI
    pix = page.get_pixmap(matrix=mat)
    buf = io.BytesIO()
    buf.write(pix.tobytes("jpeg"))
    buf.seek(0)
    return buf.getvalue()


async def extract_document(image_bytes: bytes, mime_type: str, doc_type: DocType) -> dict:
    """Send image to Groq vision model and return extracted fields."""
    prompt = _PROMPTS.get(doc_type, _PROMPTS[DocType.PO])

    try:
        # Convert PDF to image if needed
        if mime_type == "application/pdf":
            try:
                image_bytes = _pdf_to_image(image_bytes)
                mime_type = "image/jpeg"
            except Exception as e:
                return {"_error": f"PDF conversion failed: {str(e)}"}

        # Encode image as base64
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{b64_image}"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            max_tokens=1000,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw)

    except json.JSONDecodeError as e:
        logger.warning("Groq returned non-JSON: %s", e)
        return {"_raw_response": raw if "raw" in dir() else ""}
    except Exception as e:
        logger.error("Groq OCR error: %s", e)
        return {"_error": str(e)}