import { Badge } from '../components/Badge';
import { Search, Filter, Download, Eye, CircleCheck, CircleX, DollarSign, ChevronLeft, ChevronRight, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { api, downloadBlob, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { can } from '../lib/permissions';
import { toast } from 'sonner';

interface PORecord {
  id: string;
  po_number: string;
  buyer_name: string | null;
  seller_name: string | null;
  quality_description: string | null;
  quantity_bags: number | null;
  shipment_start: string | null;
  payment_status: string;
  eudr_compliant: boolean | null;
  status: string;
}

interface POListResponse {
  items: PORecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const FALLBACK: PORecord[] = [
  { id: '1', po_number: 'EFI25120039', buyer_name: 'EFICO NV', seller_name: 'LATA AGRI EXPORT', quality_description: 'Ethiopia Djimmah GR 5', quantity_bags: 160, shipment_start: '2025-12-03', payment_status: 'pending', eudr_compliant: true, status: 'uploaded' },
  { id: '2', po_number: 'EFI25120040', buyer_name: 'Global Coffee Co', seller_name: 'LATA AGRI EXPORT', quality_description: 'Arabica Grade 1', quantity_bags: 200, shipment_start: '2026-01-14', payment_status: 'received', eudr_compliant: null, status: 'approved' },
  { id: '3', po_number: 'EFI25120041', buyer_name: 'Premium Foods', seller_name: 'LATA AGRI EXPORT', quality_description: 'Djimmah Grade 4', quantity_bags: 80, shipment_start: '2026-01-15', payment_status: 'overdue', eudr_compliant: false, status: 'uploaded' },
];

interface PurchaseOrdersPageProps {
  onNavigate: (page: string, poId?: string) => void;
}

export function PurchaseOrdersPage({ onNavigate }: PurchaseOrdersPageProps) {
  const { user } = useAuth();
  const [pos, setPos] = useState<PORecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const limit = 10;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (paymentFilter) params.set('payment_status', paymentFilter);
      const data = await api.get<POListResponse>(`/api/po?${params}`);
      setPos(data.items);
      setTotal(data.total);
      setPages(Math.max(1, data.pages));
      setUsingFallback(false);
    } catch {
      setPos(FALLBACK);
      setTotal(FALLBACK.length);
      setPages(1);
      setUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [page, paymentFilter, search]);

  useEffect(() => {
    load();
  }, [page, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await api.patch(`/api/po/${id}/approve`);
      toast.success('Purchase order approved');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not approve this PO');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningId(id);
    try {
      await api.patch(`/api/po/${id}/reject`);
      toast.info('Purchase order rejected');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reject this PO');
    } finally {
      setActioningId(null);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const blob = await api.blob(`/api/reports/po/export?format=${format}`);
      downloadBlob(blob, `omniscan_po_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Export failed — is the backend running?');
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'received':
      case 'paid':
        return <Badge variant="success">Received</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'overdue':
        return <Badge variant="danger">Overdue</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getEudrBadge = (compliant: boolean | null) => {
    if (compliant === true) return <Badge variant="success">Compliant</Badge>;
    if (compliant === false) return <Badge variant="danger">Non-Compliant</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return <Badge variant="success">Approved</Badge>;
    if (status === 'rejected') return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="default">{status}</Badge>;
  };

  const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage and track all purchase order records</p>
        </div>
        {can(user?.role, 'canUpload') && (
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>New PO</span>
          </button>
        )}
      </div>

      {usingFallback && (
        <div className="px-4 py-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
          Showing demo data — could not reach the backend at the configured API URL.
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-lg p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by PO number, buyer, port, or description..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => load()}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {can(user?.role, 'canReport') && (
              <>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('excel')}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Download className="w-5 h-5" />
                  <span>Excel</span>
                </button>
              </>
            )}
          </div>
        </form>

        {/* Filter Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="px-3 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Payment Status: All</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Buyer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quality</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty (bags)</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipment</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">EUDR</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && pos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : pos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">No purchase orders found.</td>
                </tr>
              ) : (
                pos.map((po) => (
                  <tr key={po.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">{po.po_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">{po.buyer_name || '—'}</td>
                    <td className="px-6 py-4 text-foreground max-w-[200px] truncate">{po.quality_description || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{po.quantity_bags ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{po.shipment_start || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getPaymentBadge(po.payment_status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getEudrBadge(po.eudr_compliant)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(po.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigate('po-details', po.id)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {can(user?.role, 'canApprove') && po.status === 'uploaded' && (
                          <>
                            <button
                              onClick={() => handleApprove(po.id)}
                              disabled={actioningId === po.id}
                              className="p-2 text-muted-foreground hover:text-success hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <CircleCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(po.id)}
                              disabled={actioningId === po.id}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <CircleX className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {can(user?.role, 'canUpdatePayment') && (
                          <button
                            onClick={() => onNavigate('po-details', po.id)}
                            className="p-2 text-muted-foreground hover:text-warning hover:bg-accent rounded-lg transition-colors"
                            title="Update payment status"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startIdx}-{endIdx}</span> of{' '}
            <span className="font-medium text-foreground">{total}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded-lg ${p === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
