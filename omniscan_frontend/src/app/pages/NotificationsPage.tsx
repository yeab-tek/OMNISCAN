import { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle, X, Check, Filter } from 'lucide-react';
import { useNotifications, Notification } from '../context/NotificationsContext';

type FilterType = 'all' | 'unread' | 'shipment' | 'payment' | 'compliance' | 'system' | 'ocr';

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const typeIcon = (type: string) => {
  const cls = 'w-5 h-5';
  if (type === 'success') return <CheckCircle className={`${cls} text-success`} />;
  if (type === 'error') return <AlertCircle className={`${cls} text-destructive`} />;
  if (type === 'warning') return <AlertTriangle className={`${cls} text-warning`} />;
  return <Info className={`${cls} text-primary`} />;
};

const typeBg = (type: string) => {
  if (type === 'success') return 'bg-success/10';
  if (type === 'error') return 'bg-destructive/10';
  if (type === 'warning') return 'bg-warning/10';
  return 'bg-primary/10';
};

const categoryLabel: Record<string, string> = {
  shipment: 'Shipment', payment: 'Payment', compliance: 'Compliance',
  system: 'System', ocr: 'OCR',
};

const categoryColor: Record<string, string> = {
  shipment: 'bg-blue-100 text-blue-700',
  payment: 'bg-orange-100 text-orange-700',
  compliance: 'bg-purple-100 text-purple-700',
  system: 'bg-gray-100 text-gray-700',
  ocr: 'bg-teal-100 text-teal-700',
};

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.category === filter;
  });

  const filterTabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'shipment', label: 'Shipment' },
    { id: 'payment', label: 'Payment' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'ocr', label: 'OCR' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-1">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
          >
            <Check className="w-4 h-4" />
            Mark all read
          </button>
          <button
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-destructive/30 rounded-lg hover:bg-destructive/5 transition-colors disabled:opacity-40 text-destructive"
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground mr-1" />
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-foreground mb-1">No notifications</p>
          <p className="text-sm text-muted-foreground">
            {filter === 'unread' ? 'All notifications have been read.' : 'Nothing here yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.map((n: Notification) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-5 py-4 border-b border-border last:border-0 transition-colors hover:bg-accent/30 ${!n.read ? 'bg-primary/[0.03]' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeBg(n.type)}`}>
                {typeIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => markAsRead(n.id)}>
                <div className="flex items-start gap-2 mb-0.5 flex-wrap">
                  <p className={`text-sm ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor[n.category] || 'bg-muted text-muted-foreground'}`}>
                    {categoryLabel[n.category]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.timestamp)}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                <button
                  onClick={() => clearNotification(n.id)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
