import { FileText, CheckCircle, AlertCircle, Save, RefreshCw, Download, Eye, Loader2 } from 'lucide-react';
import { Badge } from '../components/Badge';
import { useState } from 'react';
import { useOcrResult, OcrFieldResult } from '../context/OcrResultContext';
import { api, ApiError } from '../lib/api';
import { toast } from 'sonner';

interface OCRResultsPageProps {
  onNavigate: (page: string) => void;
}

const FALLBACK_FIELDS: OcrFieldResult[] = [
  { field: 'PO Number', key: 'po_number', value: 'EFI25120039', confidence: 98 },
  { field: 'PO Date', key: 'po_date', value: '2025-12-05', confidence: 95 },
  { field: 'Buyer Name', key: 'buyer_name', value: 'Efico N.V.', confidence: 97 },
  { field: 'Seller Name', key: 'seller_name', value: 'LATA AGRI EXPORT', confidence: 99 },
  { field: 'Quantity (Bags)', key: 'quantity_bags', value: '160', confidence: 98 },
  { field: 'Bag Weight (kg)', key: 'bag_weight_kg', value: '60', confidence: 96 },
  { field: 'Quality', key: 'quality_description', value: 'Ethiopia Djimmah GR 5 Crop 2024/2025', confidence: 94 },
  { field: 'Price per Unit', key: 'price_per_unit', value: '295.00', confidence: 91 },
  { field: 'Currency', key: 'price_currency', value: 'USC', confidence: 99 },
  { field: 'Incoterms', key: 'incoterms', value: 'FOB Djibouti, Incoterms 2020', confidence: 96 },
  { field: 'Shipment Start', key: 'shipment_start', value: '2025-12-03', confidence: 94 },
  { field: 'Shipment End', key: 'shipment_end', value: '2026-01-31', confidence: 93 },
  { field: 'Origin Port', key: 'origin_port', value: 'Djibouti', confidence: 98 },
  { field: 'Destination Port', key: 'destination_port', value: 'Antwerp, Belgium', confidence: 97 },
  { field: 'Payment Terms', key: 'payment_terms', value: 'Net cash against documents', confidence: 89 },
];

export function OCRResultsPage({ onNavigate }: OCRResultsPageProps) {
  const { result } = useOcrResult();
  const [fields, setFields] = useState<OcrFieldResult[]>(result?.fields?.length ? result.fields : FALLBACK_FIELDS);
  const [isSaving, setIsSaving] = useState(false);

  const docType = result?.docType || 'po_record';
  const fileName = result?.fileName || 'EFI25120039.pdf';

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 95) return <Badge variant="success">{confidence}%</Badge>;
    if (confidence >= 85) return <Badge variant="warning">{confidence}%</Badge>;
    return <Badge variant="danger">{confidence}%</Badge>;
  };

  const overallConfidence = fields.length
    ? Math.round(fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length)
    : 0;

  const updateField = (index: number, value: string) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.value === '') return;
      // Numeric fields the backend expects as numbers, not strings
      if (['quantity_bags', 'total_bags'].includes(f.key)) {
        payload[f.key] = parseInt(f.value, 10) || null;
      } else if (['bag_weight_kg', 'price_per_unit', 'total_amount', 'total_weight_kg'].includes(f.key)) {
        payload[f.key] = parseFloat(f.value) || null;
      } else {
        payload[f.key] = f.value;
      }
    });
    if (payload.po_number) payload.po_number = String(payload.po_number).toUpperCase();
    if (result?.fileUrl) payload.file_url = result.fileUrl;
    return payload;
  };

  const endpointFor = (type: string) => {
    switch (type) {
      case 'commercial_invoice':
        return '/api/invoices';
      case 'bill_of_lading':
        return '/api/bills-of-lading';
      case 'packing_list':
        return '/api/packing-lists';
      case 'trade_certificate':
        return '/api/certificates';
      default:
        return '/api/po';
    }
  };

  const handleSaveAndCreate = async () => {
    setIsSaving(true);
    try {
      await api.post(endpointFor(docType), buildPayload());
      toast.success('Record created successfully');
      onNavigate('purchase-orders');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save — backend unreachable. (Demo mode)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">OCR Results</h1>
          <p className="text-muted-foreground">Review and verify extracted information</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Reprocess OCR</span>
          </button>
          <button
            onClick={handleSaveAndCreate}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{isSaving ? 'Saving…' : 'Save & Create Record'}</span>
          </button>
        </div>
      </div>

      {/* Overall Confidence Score */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Overall OCR Confidence</h3>
              <p className="text-sm text-muted-foreground">Document processed successfully</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-semibold text-success">{overallConfidence}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {overallConfidence >= 90 ? 'High Confidence' : overallConfidence >= 75 ? 'Moderate Confidence' : 'Needs Review'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[120px] text-center p-4 bg-background rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Fields Extracted</p>
            <p className="text-2xl font-semibold text-foreground">{fields.length}</p>
          </div>
          <div className="flex-1 min-w-[120px] text-center p-4 bg-background rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">High Confidence</p>
            <p className="text-2xl font-semibold text-success">
              {fields.filter((f) => f.confidence >= 95).length}
            </p>
          </div>
          <div className="flex-1 min-w-[120px] text-center p-4 bg-background rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Needs Review</p>
            <p className="text-2xl font-semibold text-warning">
              {fields.filter((f) => f.confidence < 95 && f.confidence >= 85).length}
            </p>
          </div>
          <div className="flex-1 min-w-[120px] text-center p-4 bg-background rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Low Confidence</p>
            <p className="text-2xl font-semibold text-destructive">
              {fields.filter((f) => f.confidence < 85).length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Document Preview */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Original Document</h3>
            <div className="flex gap-2">
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg">
                <Eye className="w-5 h-5" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="aspect-[8.5/11] bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg border-2 border-border flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground mt-2">Processed via AI OCR</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-background rounded-lg border border-border">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Document type:</span>
              <span className="text-foreground">{docType.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        {/* Extracted Fields */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Extracted Fields</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {fields.map((field, index) => (
              <div key={field.key} className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-start justify-between mb-2">
                  <label className="font-medium text-foreground">{field.field}</label>
                  <div className="flex items-center gap-2">
                    {getConfidenceBadge(field.confidence)}
                    {field.confidence < 95 && <AlertCircle className="w-4 h-4 text-warning" />}
                  </div>
                </div>
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateField(index, e.target.value)}
                  className={`w-full px-3 py-2 bg-card border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${
                    field.confidence < 85 ? 'border-destructive' : field.confidence < 95 ? 'border-warning' : 'border-border'
                  }`}
                />
                {field.confidence < 95 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Please verify this field - confidence below 95%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-6 flex-wrap gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          <span>Review fields with low confidence scores before saving</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('upload')}
            className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndCreate}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save & Create Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
