import { StatCard } from '../components/StatCard';
import { FileText, DollarSign, AlertCircle, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface DashboardSummary {
  total_pos?: number;
  pending_payments?: number;
  overdue_payments?: number;
  upcoming_shipments?: number;
}

interface MonthlyRow {
  month: string;
  total: string | number;
}

interface PaymentBreakdownRow {
  payment_status: string;
  count: string | number;
}

interface UpcomingDeadline {
  po_number: string;
  buyer_name: string;
  shipment_start: string;
  quality_description?: string;
}

const PAYMENT_COLORS: Record<string, string> = {
  received: '#10B981',
  paid: '#10B981',
  pending: '#F59E0B',
  overdue: '#EF4444',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>({});
  const [monthlyData, setMonthlyData] = useState([
    { month: 'Jan', uploads: 45 },
    { month: 'Feb', uploads: 52 },
    { month: 'Mar', uploads: 48 },
    { month: 'Apr', uploads: 61 },
    { month: 'May', uploads: 55 },
    { month: 'Jun', uploads: 67 },
  ]);
  const [paymentData, setPaymentData] = useState([
    { name: 'Received', value: 289, color: '#10B981' },
    { name: 'Pending', value: 124, color: '#F59E0B' },
    { name: 'Overdue', value: 38, color: '#EF4444' },
  ]);
  const [upcomingShipments, setUpcomingShipments] = useState([
    { id: 1, poNumber: 'PO-2024-001', buyer: 'Acme Corp', shipmentDate: '2026-06-12', commodity: 'Coffee Beans' },
    { id: 2, poNumber: 'PO-2024-015', buyer: 'Global Traders', shipmentDate: '2026-06-14', commodity: 'Cocoa' },
    { id: 3, poNumber: 'PO-2024-023', buyer: 'Premium Foods', shipmentDate: '2026-06-15', commodity: 'Palm Oil' },
  ]);

  const complianceData = [
    { name: 'Compliant', value: 342, color: '#10B981' },
    { name: 'Pending Review', value: 86, color: '#F59E0B' },
    { name: 'Non-Compliant', value: 23, color: '#EF4444' },
  ];

  useEffect(() => {
    let cancelled = false;

    api.get<DashboardSummary>('/api/v1/dashboard/summary').then((d) => {
      if (!cancelled && d && Object.keys(d).length) setSummary(d);
    }).catch(() => {});

    api.get<PaymentBreakdownRow[]>('/api/v1/dashboard/summary').then((rows) => {
      if (!cancelled && rows?.length) {
        setPaymentData(
          rows.map((r) => ({
            name: r.payment_status.charAt(0).toUpperCase() + r.payment_status.slice(1),
            value: Number(r.count),
            color: PAYMENT_COLORS[r.payment_status] || '#64748B',
          }))
        );
      }
    }).catch(() => {});

    api.get<MonthlyRow[]>('/api/v1/dashboard/summary').then((rows) => {
      if (!cancelled && rows?.length) {
        setMonthlyData(rows.map((r) => ({ month: r.month, uploads: Number(r.total) })));
      }
    }).catch(() => {});

    api.get<UpcomingDeadline[]>('/api/v1/dashboard/deadlines').then((rows) => {
      if (!cancelled && rows?.length) {
        setUpcomingShipments(
          rows.slice(0, 5).map((r, i) => ({
            id: i,
            poNumber: r.po_number,
            buyer: r.buyer_name || 'Unknown buyer',
            shipmentDate: r.shipment_start,
            commodity: r.quality_description || '',
          }))
        );
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.full_name || 'there'}! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total PO Records"
          value={summary.total_pos?.toLocaleString() ?? '1,284'}
          icon={<FileText className="w-6 h-6" />}
          trend={{ value: '+12.5%', isPositive: true }}
        />
        <StatCard
          title="Pending Payments"
          value={summary.pending_payments ?? '124'}
          icon={<DollarSign className="w-6 h-6" />}
          trend={{ value: '-8.2%', isPositive: true }}
        />
        <StatCard
          title="Overdue Payments"
          value={summary.overdue_payments ?? '38'}
          icon={<AlertCircle className="w-6 h-6" />}
          trend={{ value: '+3.1%', isPositive: false }}
        />
        <StatCard
          title="EUDR Compliance"
          value="75.8%"
          icon={<CheckCircle className="w-6 h-6" />}
          trend={{ value: '+4.3%', isPositive: true }}
        />
        <StatCard
          title="OCR Accuracy"
          value="94.2%"
          icon={<TrendingUp className="w-6 h-6" />}
          description="Average this month"
        />
        <StatCard
          title="Upcoming Shipments"
          value={summary.upcoming_shipments ?? '18'}
          icon={<Calendar className="w-6 h-6" />}
          description="Next 7 days"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Upload Trend */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Monthly PO Upload Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Line type="monotone" dataKey="uploads" stroke="#2563EB" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Payment Status Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance Distribution */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">EUDR Compliance Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complianceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Bar dataKey="value" fill="#2563EB" radius={[8, 8, 0, 0]}>
                {complianceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Shipments */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Upcoming Shipments</h3>
          <div className="space-y-3">
            {upcomingShipments.map((shipment) => (
              <div key={shipment.id} className="p-4 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{shipment.poNumber}</p>
                    <p className="text-sm text-muted-foreground">{shipment.buyer}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {shipment.shipmentDate}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{shipment.commodity}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
