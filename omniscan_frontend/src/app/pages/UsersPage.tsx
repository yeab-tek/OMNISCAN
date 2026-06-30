import { Badge } from "../components/Badge";
import { Search, Plus, UserX, Lock, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  can,
  roleLabel,
  roleBadgeVariant,
  PERMISSIONS,
  Role,
} from "../lib/permissions";
import { toast } from "sonner";

interface SystemUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone_number: string | null;
  is_active: boolean;
  last_login: string | null;
}

const FALLBACK: SystemUser[] = [
  {
    id: "1",
    full_name: "System Admin",
    email: "admin@lataagriexport.com",
    role: "system_admin",
    phone_number: null,
    is_active: true,
    last_login: "2026-06-19T14:23:00Z",
  },
  {
    id: "2",
    full_name: "Data Entry Operator",
    email: "dataentry@lataagriexport.com",
    role: "data_entry_operator",
    phone_number: null,
    is_active: true,
    last_login: "2026-06-19T13:45:00Z",
  },
  {
    id: "3",
    full_name: "Trade Manager",
    email: "trade@lataagriexport.com",
    role: "trade_manager",
    phone_number: null,
    is_active: true,
    last_login: "2026-06-19T12:10:00Z",
  },
  {
    id: "4",
    full_name: "Finance Officer",
    email: "finance@lataagriexport.com",
    role: "finance_officer",
    phone_number: null,
    is_active: true,
    last_login: "2026-06-19T11:30:00Z",
  },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "system_admin", label: "System Admin" },
  { value: "trade_manager", label: "Trade Manager" },
  { value: "finance_officer", label: "Finance Officer" },
  { value: "data_entry_operator", label: "Data Entry Operator" },
];

const PERMISSION_ROWS: {
  label: string;
  key: keyof (typeof PERMISSIONS)["system_admin"];
}[] = [
  { label: "Upload Documents", key: "canUpload" },
  { label: "Approve / Reject POs", key: "canApprove" },
  { label: "Update Payment Status", key: "canUpdatePayment" },
  { label: "View All Records", key: "canViewAll" },
  { label: "Generate Reports", key: "canReport" },
  { label: "View Audit Log", key: "canAudit" },
  { label: "Manage Users", key: "canManageUsers" },
];

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "data_entry_operator" as Role,
    phone_number: "",
  });

  const canManage = can(user?.role, "canManageUsers");

  const load = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      const data = await api.get<SystemUser[]>(
        `/api/v1/users${params.toString() ? `?${params}` : ""}`,
      );
      setUsers(data);
      setUsingFallback(false);
    } catch {
      setUsers(FALLBACK);
      setUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">
          Only System Administrators can manage users.
        </p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post("/api/v1/users", newUser);
      toast.success("User created successfully");
      setShowCreateModal(false);
      setNewUser({
        full_name: "",
        email: "",
        password: "",
        role: "data_entry_operator",
        phone_number: "",
      });
      load();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Could not create user — backend unreachable",
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Backend exposes deactivation via DELETE /users/{id} (soft-delete: sets is_active = false).
  // There is no PATCH .../deactivate route — using DELETE here matches app/routers/users.py exactly.
  const handleDeactivate = async (id: string) => {
    try {
      await api.del(`/api/v1/users/${id}`);
      toast.success("User deactivated");
      load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not deactivate user",
      );
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage users and their access roles
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {usingFallback && (
        <div className="px-4 py-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
          Showing demo data — could not reach the backend at the configured API
          URL.
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {u.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={roleBadgeVariant(u.role)}>
                        {roleLabel(u.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {u.last_login
                        ? new Date(u.last_login).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {u.is_active && u.id !== user?.id && (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-lg transition-colors"
                            title="Deactivate user"
                          >
                            <UserX className="w-4 h-4" />
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
      </div>

      {/* Role Permissions Matrix — live, derived from src/app/lib/permissions.ts */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-1">
          Role Permissions Matrix
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          What each role can do across the system
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs text-muted-foreground">
                  Permission
                </th>
                {ROLE_OPTIONS.map((r) => (
                  <th
                    key={r.value}
                    className="px-3 py-2 text-center text-xs text-muted-foreground"
                  >
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border">
                  <td className="px-3 py-3 text-sm text-foreground">
                    {row.label}
                  </td>
                  {ROLE_OPTIONS.map((r) => (
                    <td key={r.value} className="px-3 py-3 text-center">
                      {PERMISSIONS[r.value][row.key] ? (
                        <span className="inline-flex w-5 h-5 rounded-full bg-success/10 text-success items-center justify-center text-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex w-5 h-5 rounded-full bg-muted text-muted-foreground items-center justify-center text-xs">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-7 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Add New User
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, full_name: e.target.value }))
                  }
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="john@lataagriexport.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-foreground">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, password: e.target.value }))
                  }
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-foreground">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newUser.phone_number}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, phone_number: e.target.value }))
                  }
                  placeholder="+251911000001"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-foreground">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, role: e.target.value as Role }))
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCreating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
