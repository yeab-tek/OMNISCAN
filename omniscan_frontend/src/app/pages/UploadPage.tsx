import {
  Upload,
  File,
  X,
  CheckCircle,
  Loader,
  Image,
  FileText,
  Lock,
  Camera,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API_BASE, api, getToken } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can } from "../lib/permissions";
import {
  useOcrResult,
  extractedFieldsToList,
} from "../context/OcrResultContext";
import { toast } from "sonner";

type DocType =
  | "po_record"
  | "commercial_invoice"
  | "bill_of_lading"
  | "packing_list"
  | "trade_certificate";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "processing" | "complete" | "failed" | "needs_po";
  confidence: number | null;
  jobId: string | null;
  suggestedPoNumber?: string | null;
}

interface POOption {
  id: string;
  po_number: string;
  buyer_name: string | null;
}

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "po_record", label: "Purchase Order" },
  { value: "commercial_invoice", label: "Commercial Invoice" },
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "packing_list", label: "Packing List" },
  { value: "trade_certificate", label: "Trade Certificate" },
];

const RECENT_UPLOADS = [
  { name: "EFI25120038.pdf", date: "2 hours ago", confidence: 96 },
  { name: "EFI25120037.jpg", date: "5 hours ago", confidence: 92 },
  { name: "EFI25120036.pdf", date: "Yesterday", confidence: 98 },
];

// Used only when the backend is unreachable, so the demo flow still works end-to-end.
const DEMO_EXTRACTED_FIELDS: Record<string, Record<string, unknown>> = {
  po_record: {
    po_number: "EFI25120039",
    po_date: "2025-12-05",
    buyer_name: "Efico N.V.",
    seller_name: "LATA AGRI EXPORT",
    quantity_bags: 160,
    bag_weight_kg: 60,
    quality_description: "Ethiopia Djimmah GR 5 Crop 2024/2025",
    price_per_unit: 295.0,
    price_currency: "USD",
    incoterms: "FOB Djibouti, Incoterms 2020",
    shipment_start: "2025-12-03",
    shipment_end: "2026-01-31",
    origin_port: "Djibouti",
    destination_port: "Antwerp, Belgium",
    payment_terms: "Net cash against documents",
  },
};

interface UploadPageProps {
  onNavigate: (page: string) => void;
}

export function UploadPage({ onNavigate }: UploadPageProps) {
  const { user } = useAuth();
  const { setResult } = useOcrResult();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [docType, setDocType] = useState<DocType>("po_record");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // PO selector — only relevant for non-PO doc types, since those require
  // a po_record_id (NOT NULL FK) on the backend.
  const [poOptions, setPoOptions] = useState<POOption[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  const [loadingPos, setLoadingPos] = useState(false);

  const isPoRequired = docType !== "po_record";

  useEffect(() => {
    if (!isPoRequired) return;
    setLoadingPos(true);
    api
      .get<POOption[]>("/api/v1/po-records/lookup")
      .then(setPoOptions)
      .catch(() => setPoOptions([]))
      .finally(() => setLoadingPos(false));
  }, [isPoRequired]);

  if (!can(user?.role, "canUpload")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">
          Your role does not have permission to upload documents. Contact your
          System Admin if you believe this is a mistake.
        </p>
      </div>
    );
  }

  const processFile = async (file: File) => {
    if (isPoRequired && !selectedPoId) {
      toast.error(
        "Select the Purchase Order this document belongs to before uploading",
      );
      return;
    }

    const id = `${Date.now()}-${Math.random()}`;
    const sizeLabel = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    setFiles((prev) => [
      ...prev,
      {
        id,
        name: file.name,
        size: sizeLabel,
        status: "uploading",
        confidence: null,
        jobId: null,
      },
    ]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    if (isPoRequired && selectedPoId) {
      formData.append("po_record_id", selectedPoId);
    }

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/v1/ocr/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) throw new Error("upload-failed");
      const data: { job_id: string } = await res.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "processing", jobId: data.job_id } : f,
        ),
      );
      pollJob(id, data.job_id, file.name);
    } catch {
      // Demo fallback when backend isn't reachable
      setTimeout(
        () =>
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: "processing" } : f)),
          ),
        600,
      );
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "complete", confidence: 0.94 } : f,
          ),
        );
        setResult({
          docType,
          fileName: file.name,
          fileUrl: null,
          fields: extractedFieldsToList(
            docType,
            DEMO_EXTRACTED_FIELDS[docType] || {},
            0.94,
          ),
        });
        // Persist the toast — user clicks "Review" to dismiss & navigate,
        // rather than it auto-disappearing after a few seconds.
        toast.info(
          "Demo mode: OCR processing simulated (backend not reachable)",
          {
            duration: Infinity,
            action: {
              label: "Review",
              onClick: () => onNavigate("ocr-results"),
            },
          },
        );
      }, 2200);
    }
  };

  const pollJob = (fileId: string, jobId: string, fileName: string) => {
    const token = getToken();
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/ocr/status/${jobId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) return;
        const data: {
          status: string;
          confidence?: number;
          error?: string;
          extracted_fields?: Record<string, unknown>;
          file_url?: string;
          doc_type?: string;
          suggested_po_number?: string | null;
        } = await res.json();

        if (data.status === "done") {
          clearInterval(interval);
          const confidence = data.confidence ?? 0;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "complete", confidence } : f,
            ),
          );
          setResult({
            docType: data.doc_type || docType,
            fileName,
            fileUrl: data.file_url || null,
            fields: extractedFieldsToList(
              data.doc_type || docType,
              data.extracted_fields || {},
              confidence,
            ),
          });
          // duration: Infinity keeps this visible until the user acts on it,
          // instead of disappearing after sonner's default ~4s.
          toast.success("Document processed — review the extracted fields", {
            duration: Infinity,
            action: {
              label: "Review",
              onClick: () => onNavigate("ocr-results"),
            },
          });
        } else if (data.status === "needs_po") {
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "needs_po",
                    suggestedPoNumber: data.suggested_po_number || null,
                  }
                : f,
            ),
          );
          toast.warning(
            data.suggested_po_number
              ? `Could not auto-match PO "${data.suggested_po_number}" — please select it manually below`
              : "No PO number found on this document — please select the matching PO manually",
            { duration: Infinity },
          );
        } else if (data.status === "failed") {
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, status: "failed" } : f)),
          );
          toast.error(data.error || "OCR processing failed");
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(processFile);
    e.target.value = "";
  };

  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(processFile);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">
          Upload Documents
        </h1>
        <p className="text-muted-foreground">
          Upload purchase order documents for OCR processing
        </p>
      </div>

      {/* Document Type Selector */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm mb-2 text-foreground">
            Document Type
          </label>
          <select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value as DocType);
              setSelectedPoId("");
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring min-w-[240px]"
          >
            {DOC_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* PO selector — shown only for document types that must link to a PO */}
        {isPoRequired && (
          <div>
            <label className="block text-sm mb-2 text-foreground">
              Linked Purchase Order <span className="text-destructive">*</span>
            </label>
            <select
              value={selectedPoId}
              onChange={(e) => setSelectedPoId(e.target.value)}
              disabled={loadingPos}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring min-w-[320px]"
            >
              <option value="">
                {loadingPos ? "Loading purchase orders…" : "Select a PO…"}
              </option>
              {poOptions.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number}
                  {po.buyer_name ? ` — ${po.buyer_name}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              If the document mentions its PO number, OCR will try to auto-match
              it. Otherwise, select the correct PO here before uploading.
            </p>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`bg-card border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging ? "border-primary" : "border-border hover:border-primary"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={handleFileInput}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraInput}
        />

        <div
          className="max-w-md mx-auto cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">
            Drop files here or click to upload
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Support for JPG, PNG, and PDF files up to 20MB each
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Select Files
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span>Scan with Camera</span>
          </button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">
            Uploaded Files ({files.length})
          </h3>
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 bg-background rounded-lg border border-border"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    {file.name.toLowerCase().endsWith(".pdf") ? (
                      <FileText className="w-6 h-6 text-destructive" />
                    ) : (
                      <Image className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {file.size}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setFiles((prev) =>
                            prev.filter((f) => f.id !== file.id),
                          )
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {file.status === "uploading" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    )}
                    {file.status === "processing" && (
                      <div className="flex items-center gap-2 text-warning">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                          Processing with AI OCR...
                        </span>
                      </div>
                    )}
                    {file.status === "complete" && (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">
                          Processing complete
                          {file.confidence != null
                            ? ` — Confidence: ${Math.round(file.confidence * 100)}%`
                            : ""}
                        </span>
                      </div>
                    )}
                    {file.status === "needs_po" && (
                      <div className="text-warning text-sm">
                        Could not determine the linked PO
                        {file.suggestedPoNumber
                          ? ` (found "${file.suggestedPoNumber}" but no match)`
                          : ""}
                        . Select the correct PO above and re-upload this file.
                      </div>
                    )}
                    {file.status === "failed" && (
                      <div className="flex items-center gap-2 text-destructive">
                        <X className="w-4 h-4" />
                        <span className="text-sm">
                          Processing failed — try again
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Uploads</h3>
        <div className="space-y-3">
          {RECENT_UPLOADS.map((upload, index) => (
            <div
              key={index}
              onClick={() => onNavigate("ocr-results")}
              className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <File className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{upload.name}</p>
                  <p className="text-sm text-muted-foreground">{upload.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="font-medium text-success">
                    {upload.confidence}%
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
