import { useState } from 'react';
import {
  User, Lock, Bell, Settings as SettingsIcon, Palette, Shield,
  Save, Camera, Eye, EyeOff, Sun, Moon, Monitor, Check,
  Globe, Database, Download, Trash2, RefreshCw, ChevronRight,
  Loader2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationsContext';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { roleLabel } from '../lib/permissions';
import { toast } from 'sonner';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance' | 'system';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-switch-background'}`}
    >
      <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function SettingRow({ title, description, checked, onChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div>
        <p className="text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { theme, setTheme } = useTheme();
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  const nameParts = (user?.full_name || 'John Doe').split(' ');

  const [profile, setProfile] = useState({
    firstName: nameParts[0] || 'John',
    lastName: nameParts.slice(1).join(' ') || 'Doe',
    email: user?.email || 'john.doe@lataagriexport.com',
    jobTitle: roleLabel(user?.role),
    phone: '+251911000001',
    bio: 'Managing document digitization and compliance workflows.',
    timezone: 'UTC+3 (Addis Ababa, Ethiopia)',
    language: 'English (US)',
  });

  const [security, setSecurity] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
    twoFactor: true, sessionTimeout: '30',
    loginAlerts: true, apiAccess: false,
  });

  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const [notifPrefs, setNotifPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    shipmentReminders: true,
    paymentAlerts: true,
    complianceAlerts: true,
    weeklyReports: false,
    monthlyReports: true,
    ocrCompletion: true,
    systemMaintenance: false,
    newUserAlerts: true,
  });

  const [system, setSystem] = useState({
    compactMode: false,
    animationsEnabled: true,
    autoSave: true,
    debugMode: false,
    betaFeatures: false,
    dataRetention: '90',
    defaultCurrency: 'USD',
    dateFormat: 'MM/DD/YYYY',
  });

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = async () => {
    setSaveState('saving');
    if (security.newPassword) {
      if (security.newPassword !== security.confirmPassword) {
        toast.error('New passwords do not match');
        setSaveState('idle');
        return;
      }
      try {
        await api.post('/api/auth/change-password', {
          current_password: security.currentPassword,
          new_password: security.newPassword,
        });
        setSecurity((p) => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not change password');
        setSaveState('idle');
        return;
      }
    }
    setTimeout(() => {
      setSaveState('saved');
      addNotification({ title: 'Settings saved', message: 'Your preferences have been updated successfully.', type: 'success', category: 'system' });
      toast.success('Settings saved');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 400);
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: SettingsIcon },
  ];

  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun; desc: string }[] = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Classic light interface' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes at night' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Follows OS preference' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* MARKER-MAKE-KIT-INVOKED */}
      <div>
        <h1 className="text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account, security, and application preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-border last:border-0 ${
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {!isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <>
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-foreground mb-4">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-border">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-card border border-border rounded-full flex items-center justify-center hover:bg-accent transition-colors shadow-sm">
                      <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div>
                    <p className="text-foreground">{profile.firstName} {profile.lastName}</p>
                    <p className="text-sm text-muted-foreground">{profile.jobTitle}</p>
                    <button className="mt-1 text-xs text-primary hover:underline">Change avatar</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Job Title</label>
                    <input
                      type="text"
                      value={profile.jobTitle}
                      onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Timezone</label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      <option>UTC-8 (Pacific Time)</option>
                      <option>UTC-5 (Eastern Time)</option>
                      <option>UTC+0 (Greenwich)</option>
                      <option>UTC+1 (Central Europe)</option>
                      <option>UTC+8 (Singapore)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-foreground mb-1.5">Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <>
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-foreground mb-4">Change Password</h2>
                <div className="space-y-4">
                  {((['current', 'new', 'confirm'] as const)).map((field) => {
                    const labels = { current: 'Current Password', new: 'New Password', confirm: 'Confirm New Password' };
                    const placeholders = { current: 'Enter current password', new: 'Min 8 characters', confirm: 'Repeat new password' };
                    return (
                      <div key={field}>
                        <label className="block text-sm text-foreground mb-1.5">{labels[field]}</label>
                        <div className="relative">
                          <input
                            type={showPw[field] ? 'text' : 'password'}
                            value={field === 'current' ? security.currentPassword : field === 'new' ? security.newPassword : security.confirmPassword}
                            onChange={(e) => setSecurity({ ...security, [`${field}Password`]: e.target.value })}
                            placeholder={placeholders[field]}
                            className="w-full px-3 py-2 pr-10 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw((s) => ({ ...s, [field]: !s[field] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-primary" />
                  <h2 className="text-foreground">Security Options</h2>
                </div>
                <SettingRow
                  title="Two-Factor Authentication"
                  description="Require a verification code on each login"
                  checked={security.twoFactor}
                  onChange={(v) => setSecurity({ ...security, twoFactor: v })}
                />
                <SettingRow
                  title="Login Alerts"
                  description="Get notified when a new device logs in"
                  checked={security.loginAlerts}
                  onChange={(v) => setSecurity({ ...security, loginAlerts: v })}
                />
                <SettingRow
                  title="API Access"
                  description="Allow programmatic API access with tokens"
                  checked={security.apiAccess}
                  onChange={(v) => setSecurity({ ...security, apiAccess: v })}
                />
                <div className="pt-4">
                  <label className="block text-sm text-foreground mb-1.5">Session Timeout (minutes)</label>
                  <select
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                    className="w-48 px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="0">Never</option>
                  </select>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm text-foreground mb-3">Active Sessions</h3>
                {[
                  { device: 'Chrome on MacOS', location: 'New York, US', time: 'Current session', current: true },
                  { device: 'Safari on iPhone', location: 'New York, US', time: '2 hours ago', current: false },
                ].map((session) => (
                  <div key={session.device} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm text-foreground">{session.device}</p>
                      <p className="text-xs text-muted-foreground">{session.location} · {session.time}</p>
                    </div>
                    {session.current ? (
                      <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">Active</span>
                    ) : (
                      <button className="text-xs text-destructive hover:underline">Revoke</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <>
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-foreground mb-1">Notification Preferences</h2>
                <p className="text-sm text-muted-foreground mb-4">Choose how and when you receive notifications.</p>

                <div className="mb-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Channels</p>
                  <SettingRow title="Email Notifications" description="Receive updates via email" checked={notifPrefs.emailNotifications} onChange={(v) => setNotifPrefs({ ...notifPrefs, emailNotifications: v })} />
                  <SettingRow title="Push Notifications" description="In-app browser notifications" checked={notifPrefs.pushNotifications} onChange={(v) => setNotifPrefs({ ...notifPrefs, pushNotifications: v })} />
                </div>

                <div className="mb-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Operational Alerts</p>
                  <SettingRow title="Shipment Reminders" description="Upcoming shipment and departure alerts" checked={notifPrefs.shipmentReminders} onChange={(v) => setNotifPrefs({ ...notifPrefs, shipmentReminders: v })} />
                  <SettingRow title="Payment Alerts" description="Overdue invoices and payment due dates" checked={notifPrefs.paymentAlerts} onChange={(v) => setNotifPrefs({ ...notifPrefs, paymentAlerts: v })} />
                  <SettingRow title="Compliance Alerts" description="EUDR documentation and compliance updates" checked={notifPrefs.complianceAlerts} onChange={(v) => setNotifPrefs({ ...notifPrefs, complianceAlerts: v })} />
                  <SettingRow title="OCR Completion" description="Notify when OCR processing finishes" checked={notifPrefs.ocrCompletion} onChange={(v) => setNotifPrefs({ ...notifPrefs, ocrCompletion: v })} />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Reports & System</p>
                  <SettingRow title="Weekly Reports" description="Weekly summary digest every Monday" checked={notifPrefs.weeklyReports} onChange={(v) => setNotifPrefs({ ...notifPrefs, weeklyReports: v })} />
                  <SettingRow title="Monthly Reports" description="Monthly performance overview" checked={notifPrefs.monthlyReports} onChange={(v) => setNotifPrefs({ ...notifPrefs, monthlyReports: v })} />
                  <SettingRow title="New User Alerts" description="When new users are added to the system" checked={notifPrefs.newUserAlerts} onChange={(v) => setNotifPrefs({ ...notifPrefs, newUserAlerts: v })} />
                  <SettingRow title="System Maintenance" description="Scheduled downtime and maintenance windows" checked={notifPrefs.systemMaintenance} onChange={(v) => setNotifPrefs({ ...notifPrefs, systemMaintenance: v })} />
                </div>
              </div>
            </>
          )}

          {/* ── APPEARANCE ── */}
          {activeTab === 'appearance' && (
            <>
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-foreground mb-1">Theme</h2>
                <p className="text-sm text-muted-foreground mb-5">Choose your preferred color theme.</p>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className={`text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>{opt.label}</p>
                        <p className="text-xs text-muted-foreground text-center">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-foreground mb-4">Display Options</h2>
                <SettingRow title="Compact Mode" description="Reduce spacing for more content density" checked={system.compactMode} onChange={(v) => setSystem({ ...system, compactMode: v })} />
                <SettingRow title="Animations" description="Enable UI motion and transitions" checked={system.animationsEnabled} onChange={(v) => setSystem({ ...system, animationsEnabled: v })} />
              </div>
            </>
          )}

          {/* ── SYSTEM ── */}
          {activeTab === 'system' && (
            <>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-primary" />
                  <h2 className="text-foreground">Regional Settings</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Language</label>
                    <select className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm">
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Default Currency</label>
                    <select
                      value={system.defaultCurrency}
                      onChange={(e) => setSystem({ ...system, defaultCurrency: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                      <option value="SGD">SGD — Singapore Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Date Format</label>
                    <select
                      value={system.dateFormat}
                      onChange={(e) => setSystem({ ...system, dateFormat: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5">Data Retention (days)</label>
                    <select
                      value={system.dataRetention}
                      onChange={(e) => setSystem({ ...system, dataRetention: e.target.value })}
                      className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">180 days</option>
                      <option value="365">1 year</option>
                      <option value="0">Forever</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-primary" />
                  <h2 className="text-foreground">Application</h2>
                </div>
                <SettingRow title="Auto-Save" description="Automatically save form changes" checked={system.autoSave} onChange={(v) => setSystem({ ...system, autoSave: v })} />
                <SettingRow title="Beta Features" description="Access new features before general release" checked={system.betaFeatures} onChange={(v) => setSystem({ ...system, betaFeatures: v })} />
                <SettingRow title="Debug Mode" description="Enable developer console logging" checked={system.debugMode} onChange={(v) => setSystem({ ...system, debugMode: v })} />
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-foreground mb-4">Data & Storage</h2>
                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-accent transition-colors text-left">
                    <Download className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm text-foreground">Export My Data</p>
                      <p className="text-xs text-muted-foreground">Download all your data as a ZIP archive</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-accent transition-colors text-left">
                    <RefreshCw className="w-4 h-4 text-warning" />
                    <div>
                      <p className="text-sm text-foreground">Reset to Defaults</p>
                      <p className="text-xs text-muted-foreground">Restore all settings to factory defaults</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 border border-destructive/30 rounded-lg hover:bg-destructive/5 transition-colors text-left">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    <div>
                      <p className="text-sm text-destructive">Delete Account</p>
                      <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </button>
                </div>
              </div>

              <div className="bg-muted/50 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground text-center">OmniScan v2.0.0 · Built for enterprise document management · © 2024</p>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-sm ${
                saveState === 'saved'
                  ? 'bg-success text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              } disabled:opacity-60`}
            >
              {saveState === 'saving' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveState === 'saved' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
