import { Badge } from "../components/Badge";
import {
  ArrowLeft,
  Download,
  Edit,
  FileText,
  Package,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError, downloadBlob } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { can } from "../lib/permissions";
import { toast } from "sonner";

interface PORecordFull {
  id: string;
  po_number: string;
  po_date: string | null;
  buyer_name: string | null;
  buyer_country: string | null;
  seller_name: string | null;
  quantity_bags: number | null;
  bag_weight_kg: string | number | null;
  quality_description: string | null;
  crop_year: string | null;
  price_per_unit: string | number | null;
  price_currency: string | null;
  incoterms: string | null;
  shipment_start: string | null;
  shipment_end: string | null;
  origin_port: string | null;
  destination_port: string | null;
  payment_terms: string | null;
  payment_status: string;
  eudr_compliant: boolean | null;
  status: string;
  created_at: string;
}

interface AuditEntry {
  id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  created_at: string;
}

// The audit-log endpoint may return a raw array OR a paginated wrapper.
// This type covers both shapes so the frontend doesn't assume one.
type AuditLogResponse =
  | AuditEntry[]
  | { items: AuditEntry[] }
  | null
  | undefined;

interface PODetailsPageProps {
  poId: string | null;
  onBack: () => void;
}

const FALLBACK_PO: PORecordFull = {
  id: "demo",
  po_number: "EFI25120039",
  po_date: "2025-12-05",
  buyer_name: "EFICO NV",
  buyer_country: "Belgium",
  seller_name: "LATA AGRI EXPORT",
  quantity_bags: 160,
  bag_weight_kg: 60,
  quality_description: "Ethiopia Djimmah GR 5 Crop 2024/2025",
  crop_year: "2024/2025",
  price_per_unit: 295.0,
  price_currency: "USC",
  incoterms: "FOB Djibouti, Incoterms 2020",
  shipment_start: "2025-12-03",
  shipment_end: "2026-01-31",
  origin_port: "Djibouti",
  destination_port: "Antwerp, Belgium",
  payment_terms: "Net cash against documents",
  payment_status: "pending",
  eudr_compliant: true,
  status: "uploaded",
  created_at: "2025-12-05T09:30:00Z",
};

// Normalize whatever shape the backend returns into a plain array.
function normalizeAuditLog(data: AuditLogResponse): AuditEntry[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { items: AuditEntry[] }).items)) {
    return (data as { items: AuditEntry[] }).items;
  }
  return [];
}

export function PODetailsPage({ poId, onBack }: PODetailsPageProps) {
  const { user } = useAuth();
  const [po, setPo] = useState<PORecordFull>(FALLBACK_PO);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    if (!poId) return;
    setIsLoading(true);
    Promise.all([
      api.get<PORecordFull>(`/api/v1/po-records/${poId}`).catch(() => null),
      api.get<AuditLogResponse>(`/api/v1/dashboard/audit-log`).catch(() => []),
    ]).then(([poData, activityData]) => {
      if (poData) setPo(poData);
      setActivity(normalizeAuditLog(activityData));
      setIsLoading(false);
    });
  }, [poId]);

  const handleExport = async () => {
    try {
      const blob = await api.blob(
        `/api/v1/reports/po/export?format=pdf&buyer=${encodeURIComponent(po.buyer_name || "")}`,
      );
      downloadBlob(blob, `${po.po_number}.pdf`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Export failed");
    }
  };

  const handlePaymentUpdate = async (newStatus: string) => {
    if (!poId) return;
    setUpdatingPayment(true);
    try {
      const updated = await api.patch<PORecordFull>(
        `/api/v1/po-records/${poId}`,
        { payment_status: newStatus },
      );
      setPo(updated);
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Could not update payment status",
      );
    } finally {
      setUpdatingPayment(false);
    }
  };

  const paymentBadge = (status: string) => {
    if (status === "received" || status === "paid")
      return <Badge variant="success">Received</Badge>;
    if (status === "overdue") return <Badge variant="danger">Overdue</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  const eudrBadge = (compliant: boolean | null) => {
    if (compliant === true) return <Badge variant="success">Compliant</Badge>;
    if (compliant === false)
      return <Badge variant="danger">Non-Compliant</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge variant="success">Approved</Badge>;
    if (status === "rejected") return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="info">{status}</Badge>;
  };

  const totalAmount =
    po.price_per_unit && po.quantity_bags && po.bag_weight_kg
      ? (
          Number(po.price_per_unit) *
          Number(po.quantity_bags) *
          Number(po.bag_weight_kg)
        ).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-1">
              {po.po_number}
            </h1>
            <p className="text-muted-foreground">Purchase Order Details</p>
          </div>
          {isLoading && (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          {can(user?.role, "canUpload") && (
            <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors">
              <Edit className="w-5 h-5" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Payment Status
              </p>
              {paymentBadge(po.payment_status)}
            </div>
            <div className="w-px h-10 bg-border hidden sm:block"></div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">EUDR Status</p>
              {eudrBadge(po.eudr_compliant)}
            </div>
            <div className="w-px h-10 bg-border hidden sm:block"></div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Record Status
              </p>
              {statusBadge(po.status)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium text-foreground">
              {po.created_at
                ? new Date(po.created_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buyer & Seller Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Trading Partners
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-foreground">Buyer</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">
                    {po.buyer_name || "—"}
                  </p>
                  <div className="flex items-start gap-2 mt-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      {po.buyer_country || "—"}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-success" />
                  <h4 className="font-medium text-foreground">Seller</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">
                    {po.seller_name || "LATA AGRI EXPORT"}
                  </p>
                  <div className="flex items-start gap-2 mt-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Addis Ababa, Ethiopia
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Commodity Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Commodity Details
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Quality / Grade
                  </p>
                  <p className="font-medium text-foreground">
                    {po.quality_description || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Crop Year
                  </p>
                  <p className="font-medium text-foreground">
                    {po.crop_year || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                  <p className="font-medium text-foreground">
                    {po.quantity_bags ?? "—"} bags
                    {po.bag_weight_kg ? ` (${po.bag_weight_kg}kg each)` : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Unit Price
                  </p>
                  <p className="font-medium text-foreground">
                    {po.price_per_unit
                      ? `${po.price_currency || "USC"} ${po.price_per_unit}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Estimated Total
                  </p>
                  <p className="text-2xl font-semibold text-primary">
                    {totalAmount
                      ? `${po.price_currency || "USC"} ${totalAmount}`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipment Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Shipment Details
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Shipment Start
                </p>
                <p className="font-medium text-foreground">
                  {po.shipment_start || "—"}
                </p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Shipment End
                </p>
                <p className="font-medium text-foreground">
                  {po.shipment_end || "—"}
                </p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Origin Port
                </p>
                <p className="font-medium text-foreground">
                  {po.origin_port || "—"}
                </p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Incoterms</p>
                <p className="font-medium text-foreground">
                  {po.incoterms || "—"}
                </p>
              </div>
              <div className="p-3 bg-background rounded-lg sm:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">
                  Destination Port
                </p>
                <p className="font-medium text-foreground">
                  {po.destination_port || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Linked Documents */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Linked Documents
            </h3>
            <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Original PO Document
                </p>
                <p className="text-sm text-muted-foreground">
                  Uploaded{" "}
                  {po.created_at
                    ? new Date(po.created_at).toLocaleDateString()
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Payment</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {paymentBadge(po.payment_status)}
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Terms</p>
                <p className="font-medium text-foreground">
                  {po.payment_terms || "—"}
                </p>
              </div>

              {can(user?.role, "canUpdatePayment") && (
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    Update Payment Status
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "received", "overdue"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handlePaymentUpdate(s)}
                        disabled={updatingPayment || po.payment_status === s}
                        className={`px-3 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          po.payment_status === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:bg-accent text-foreground"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* EUDR Compliance */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-success" />
              <h3 className="font-semibold text-foreground">EUDR Compliance</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {eudrBadge(po.eudr_compliant)}
              </div>
            </div>
          </div>

          {/* Audit History */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              ) : (
                activity.slice(0, 8).map((a) => (
                  <div
                    key={a.id}
                    className="p-3 bg-background rounded-lg border border-border"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {a.user_email || "System"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(a.user_role || "").replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground mt-2 capitalize">
                      {a.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
