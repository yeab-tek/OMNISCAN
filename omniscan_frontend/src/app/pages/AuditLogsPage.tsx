import { Clock, User, Edit, Trash2, FileText, Upload, CheckCircle, Lock, Loader2, Download, LogIn, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError, downloadBlob } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { can, roleLabel } from '../lib/permissions';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  table_name: string;
  record_ref: string | null;
  created_at: string;
}

interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

const FALLBACK: AuditLogEntry[] = [
  { id: '1', user_email: 'admin@lataagriexport.com', user_role: 'system_admin', action: 'create', table_name: 'po_records', record_ref: 'EFI25120039', created_at: '2026-06-19T14:23:15Z' },
  { id: '2', user_email: 'dataentry@lataagriexport.com', user_role: 'data_entry_operator', action: 'create', table_name: 'commercial_invoices', record_ref: 'INV-2026-001', created_at: '2026-06-19T13:45:22Z' },
  { id: '3', user_email: 'trade@lataagriexport.com', user_role: 'trade_manager', action: 'approve', table_name: 'po_records', record_ref: 'EFI25120038', created_at: '2026-06-19T12:10:44Z' },
  { id: '4', user_email: 'finance@lataagriexport.com', user_role: 'finance_officer', action: 'update', table_name: 'po_records', record_ref: 'EFI25120037', created_at: '2026-06-19T11:30:18Z' },
  { id: '5', user_email: 'admin@lataagriexport.com', user_role: 'system_admin', action: 'login', table_name: 'users', record_ref: 'admin@lataagriexport.com', created_at: '2026-06-19T10:15:33Z' },
];

const ACTION_ICON: Record<string, typeof Edit> = {
  create: FileText,
  update: Edit,
  delete: Trash2,
  approve: CheckCircle,
  reject: X,
  login: LogIn,
  export: Download,
};

const ACTION_COLOR: Record<string, string> = {
  create: 'text-success',
  update: 'text-primary',
  delete: 'text-destructive',
  approve: 'text-success',
  reject: 'text-destructive',
  login: 'text-muted-foreground',
  export: 'text-primary',
};

const ACTION_BORDER: Record<string, string> = {
  create: 'border-success',
  update: 'border-primary',
  delete: 'border-destructive',
  approve: 'border-success',
  reject: 'border-destructive',
  login: 'border-border',
  export: 'border-primary',
};

export function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [filters, setFilters] = useState({ user_email: '', action: '', table_name: '', from_date: '', to_date: '' });

  const canAudit = can(user?.role, 'canAudit');

  const load = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const data = await api.get<AuditLogListResponse>(`/api/v1/dashboard/audit-log?${params}`);
      setLogs(data.items);
      setTotal(data.total);
      setUsingFallback(false);
    } catch {
      setLogs(FALLBACK);
      setTotal(FALLBACK.length);
      setUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canAudit) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCsv = async () => {
    try {
      const blob = await api.blob('/api/v1/dashboard/audit-log');
      downloadBlob(blob, 'omniscan_audit_log.csv');
      toast.success('Audit log exported');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Export failed');
    }
  };

  if (!canAudit) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">Only System Administrators can view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system activities and changes ({total} total)</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {usingFallback && (
        <div className="px-4 py-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
          Showing demo data — could not reach the backend at the configured API URL.
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-2 text-foreground">User Email</label>
            <input
              type="text"
              value={filters.user_email}
              onChange={(e) => setFilters((p) => ({ ...p, user_email: e.target.value }))}
              placeholder="Search by email..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-foreground">Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="login">Login</option>
              <option value="export">Export</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2 text-foreground">Table</label>
            <select
              value={filters.table_name}
              onChange={(e) => setFilters((p) => ({ ...p, table_name: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Tables</option>
              <option value="po_records">Purchase Orders</option>
              <option value="users">Users</option>
              <option value="commercial_invoices">Invoices</option>
              <option value="bills_of_lading">Bills of Lading</option>
              <option value="packing_lists">Packing Lists</option>
              <option value="trade_certificates">Certificates</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={load}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-6">Activity Timeline</h3>
        {isLoading && logs.length === 0 ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No activity recorded yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-border"></div>

            <div className="space-y-6">
              {logs.map((log) => {
                const Icon = ACTION_ICON[log.action] || FileText;
                const color = ACTION_COLOR[log.action] || 'text-muted-foreground';
                const border = ACTION_BORDER[log.action] || 'border-border';
                return (
                  <div key={log.id} className="relative flex gap-4">
                    <div className={`relative z-10 w-12 h-12 rounded-full bg-card border-2 flex items-center justify-center flex-shrink-0 ${border}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>

                    <div className="flex-1 pb-6 min-w-0">
                      <div className="bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors">
                        <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                          <div>
                            <h4 className="font-medium text-foreground mb-1 capitalize">
                              {log.action} {log.table_name.replace(/_/g, ' ')}
                            </h4>
                            <p className="text-sm text-primary">{log.record_ref || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{log.user_email || 'System'}</span>
                          <span className="text-sm text-muted-foreground">({roleLabel(log.user_role || undefined)})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
