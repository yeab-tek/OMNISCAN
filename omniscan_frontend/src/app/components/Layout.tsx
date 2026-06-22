import {
  Bell, Search, Settings, LogOut, User, LayoutDashboard, FileText, Upload,
  ScanLine, Users, Activity, Menu, X, Sun, Moon, Monitor, Check,
  AlertCircle, Info, CheckCircle, AlertTriangle, Trash2
} from 'lucide-react';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationsContext';
import { useAuth } from '../context/AuthContext';
import { can, roleLabel, Role } from '../lib/permissions';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string, poId?: string) => void;
  userRole?: string;
  onLogout?: () => void;
}

const notifIcon = (type: string) => {
  if (type === 'success') return <CheckCircle className="w-4 h-4 text-success" />;
  if (type === 'error') return <AlertCircle className="w-4 h-4 text-destructive" />;
  if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-warning" />;
  return <Info className="w-4 h-4 text-primary" />;
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Layout({ children, currentPage, onNavigate, userRole = 'data_entry_operator', onLogout }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const { user } = useAuth();
  const role = (userRole || 'data_entry_operator') as Role;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, always: true },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText, always: true },
    { id: 'upload', label: 'Upload Document', icon: Upload, perm: 'canUpload' as const },
    { id: 'notifications', label: 'Notifications', icon: Bell, always: true },
    { id: 'audit-logs', label: 'Audit Logs', icon: Activity, perm: 'canAudit' as const },
    { id: 'users', label: 'User Management', icon: Users, perm: 'canManageUsers' as const },
    { id: 'settings', label: 'Settings', icon: Settings, always: true },
  ];

  // RBAC: hide nav items the current role isn't permitted to use
  const navigationItems = allNavigationItems.filter((item) => item.always || can(role, item.perm!));

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="flex h-screen bg-background">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transform transition-transform duration-300 lg:transform-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sidebar-foreground leading-none">OmniScan</h1>
                <span className="text-xs text-sidebar-primary font-medium">v2.0</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Document Management</p>
          </div>
          <button className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5 text-sidebar-foreground" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground px-4 mb-2 uppercase tracking-wider">Navigation</p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg mb-0.5 transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-sidebar-foreground truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{roleLabel(role)}</p>
            </div>
            <button
              onClick={onLogout}
              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button className="lg:hidden p-2 hover:bg-accent rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 max-w-md">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search documents, POs..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Theme Switcher */}
              <div ref={themeRef} className="relative">
                <button
                  onClick={() => { setIsThemeOpen(!isThemeOpen); setIsNotifOpen(false); }}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                  title="Theme"
                >
                  {resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
                {isThemeOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                    {themeOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { setTheme(opt.value); setIsThemeOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            theme === opt.value
                              ? 'text-primary bg-accent'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{opt.label}</span>
                          {theme === opt.value && <Check className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { setIsNotifOpen(!isNotifOpen); setIsThemeOpen(false); }}
                  className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm text-foreground">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">Mark all read</button>
                        <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive">Clear all</button>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                          >
                            <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                            <div className="flex-1 min-w-0" onClick={() => markAsRead(n.id)}>
                              <p className={`text-sm truncate ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo(n.timestamp)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!n.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                              <button onClick={() => clearNotification(n.id)} className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-2 border-t border-border">
                      <button
                        onClick={() => { handleNavigate('notifications'); setIsNotifOpen(false); }}
                        className="w-full text-center text-sm text-primary hover:underline py-1"
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNavigate('settings')}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
