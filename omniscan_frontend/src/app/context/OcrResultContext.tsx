// src/app/context/OcrResultContext.tsx
// ============================================================
// Carries the most recent OCR extraction result from UploadPage
// to OCRResultsPage, since they're separate "pages" in this
// single-page-app navigation pattern (no router params).
// ============================================================

import { createContext, useContext, useState, ReactNode } from 'react';

export interface OcrFieldResult {
  field: string;
  key: string;
  value: string;
  confidence: number;
}

export interface OcrResult {
  docType: string;
  fileName: string;
  fileUrl: string | null;
  fields: OcrFieldResult[];
}

interface OcrResultContextValue {
  result: OcrResult | null;
  setResult: (r: OcrResult | null) => void;
}

const OcrResultContext = createContext<OcrResultContextValue>({} as OcrResultContextValue);

export function OcrResultProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<OcrResult | null>(null);
  return <OcrResultContext.Provider value={{ result, setResult }}>{children}</OcrResultContext.Provider>;
}

export function useOcrResult() {
  return useContext(OcrResultContext);
}

/**
 * Converts the raw extracted_fields object from the backend
 * (e.g. { po_number: "EFI123", buyer_name: "EFICO" }) into the
 * field-list shape the OCRResultsPage UI expects.
 */
export function extractedFieldsToList(
  docType: string,
  extracted: Record<string, unknown>,
  confidence: number
): OcrFieldResult[] {
  const LABELS: Record<string, string> = {
    po_number: 'PO Number',
    po_date: 'PO Date',
    buyer_name: 'Buyer Name',
    buyer_country: 'Buyer Country',
    seller_name: 'Seller Name',
    quantity_bags: 'Quantity (Bags)',
    bag_weight_kg: 'Bag Weight (kg)',
    quality_description: 'Quality',
    crop_year: 'Crop Year',
    price_per_unit: 'Price per Unit',
    price_currency: 'Currency',
    incoterms: 'Incoterms',
    shipment_start: 'Shipment Start',
    shipment_end: 'Shipment End',
    origin_port: 'Origin Port',
    destination_port: 'Destination Port',
    payment_terms: 'Payment Terms',
    invoice_number: 'Invoice Number',
    invoice_date: 'Invoice Date',
    total_amount: 'Total Amount',
    currency: 'Currency',
    bl_number: 'BL Number',
    bl_date: 'BL Date',
    shipper_name: 'Shipper',
    consignee_name: 'Consignee',
    carrier_name: 'Carrier',
    vessel_name: 'Vessel',
    voyage_number: 'Voyage Number',
    container_number: 'Container Number',
    pl_number: 'Packing List Number',
    pl_date: 'Packing List Date',
    total_bags: 'Total Bags',
    total_weight_kg: 'Total Weight (kg)',
    product_description: 'Product Description',
    certificate_type: 'Certificate Type',
    certificate_number: 'Certificate Number',
    issue_date: 'Issue Date',
    expiry_date: 'Expiry Date',
    issued_by: 'Issued By',
  };

  return Object.entries(extracted)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      field: LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      key,
      value: value === null ? '' : String(value),
      // Per-field confidence isn't returned by the backend yet, so we use
      // the overall document confidence for every field as a reasonable estimate.
      confidence: Math.round(confidence * 100),
    }));
}
