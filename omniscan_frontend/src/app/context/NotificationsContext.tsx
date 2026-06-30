import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
  category: 'shipment' | 'payment' | 'compliance' | 'system' | 'ocr';
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({} as NotificationsContextValue);

const INITIAL: Notification[] = [
  { id: '1', title: 'New PO Uploaded', message: 'PO-2024-0089 has been successfully uploaded and queued for OCR processing.', type: 'success', read: false, timestamp: new Date(Date.now() - 5 * 60000), category: 'ocr' },
  { id: '2', title: 'Payment Overdue', message: 'Invoice INV-2024-0034 from Tropical Farms Ltd is 14 days overdue.', type: 'error', read: false, timestamp: new Date(Date.now() - 30 * 60000), category: 'payment' },
  { id: '3', title: 'EUDR Compliance Alert', message: 'Shipment SH-2024-0156 requires updated due diligence documentation.', type: 'warning', read: false, timestamp: new Date(Date.now() - 2 * 3600000), category: 'compliance' },
  { id: '4', title: 'OCR Processing Complete', message: 'PO-2024-0087 has been processed. Review extracted data.', type: 'info', read: false, timestamp: new Date(Date.now() - 4 * 3600000), category: 'ocr' },
  { id: '5', title: 'Shipment Departed', message: 'Shipment SH-2024-0154 has departed port.', type: 'info', read: true, timestamp: new Date(Date.now() - 24 * 3600000), category: 'shipment' },
  { id: '6', title: 'User Account Created', message: 'New user Maria Santos (Data Entry Operator) has been added.', type: 'success', read: true, timestamp: new Date(Date.now() - 48 * 3600000), category: 'system' },
];

interface BackendCounts {
  deadline_alerts?: number;
  overdue_alerts?: number;
  total?: number;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const clearNotification = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const clearAll = () => setNotifications([]);

  const addNotification = (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) =>
    setNotifications((prev) => [
      { ...n, id: Date.now().toString(), read: false, timestamp: new Date() },
      ...prev,
    ]);

  // Poll the backend every 60 s for real deadline/overdue counts.
  // When they change we inject a fresh notification so the badge stays accurate.
  useEffect(() => {
    let lastTotal = 0;

    const poll = async () => {
      try {
        const counts = await api.get<BackendCounts>('/api/v1/dashboard/summary');
        const total = counts.total ?? 0;
        if (total > lastTotal) {
          const diff = total - lastTotal;
          if ((counts.overdue_alerts ?? 0) > 0) {
            addNotification({
              title: 'Overdue Payment Alert',
              message: `${counts.overdue_alerts} payment(s) are now overdue. Review in Purchase Orders.`,
              type: 'error',
              category: 'payment',
            });
          }
          if ((counts.deadline_alerts ?? 0) > 0) {
            addNotification({
              title: 'Upcoming Shipment Deadline',
              message: `${counts.deadline_alerts} shipment(s) are due within the next 14 days.`,
              type: 'warning',
              category: 'shipment',
            });
          }
        }
        lastTotal = total;
      } catch {
        // Backend not reachable — silently skip, demo data remains
      }
    };

    // First poll immediately after mount, then every 60 s
    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll, addNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
