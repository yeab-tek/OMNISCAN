// src/app/lib/permissions.ts
// ============================================================
// Single source of truth for Role-Based Access Control (RBAC).
// Matches the SRS §5 Stakeholders & Actors table and the
// backend's app/core/permissions.py exactly.
// ============================================================

export type Role = 'system_admin' | 'trade_manager' | 'data_entry_operator' | 'finance_officer';

export interface PermissionSet {
  canUpload: boolean;
  canApprove: boolean;
  canUpdatePayment: boolean;
  canViewAll: boolean;
  canReport: boolean;
  canAudit: boolean;
  canManageUsers: boolean;
}

export const PERMISSIONS: Record<Role, PermissionSet> = {
  system_admin: {
    canUpload: true,
    canApprove: true,
    canUpdatePayment: true,
    canViewAll: true,
    canReport: true,
    canAudit: true,
    canManageUsers: true,
  },
  trade_manager: {
    canUpload: false,
    canApprove: true,
    canUpdatePayment: false,
    canViewAll: true,
    canReport: true,
    canAudit: false,
    canManageUsers: false,
  },
  data_entry_operator: {
    canUpload: true,
    canApprove: false,
    canUpdatePayment: false,
    canViewAll: true,
    canReport: false,
    canAudit: false,
    canManageUsers: false,
  },
  finance_officer: {
    canUpload: false,
    canApprove: false,
    canUpdatePayment: true,
    canViewAll: true,
    canReport: false,
    canAudit: false,
    canManageUsers: false,
  },
};

export function can(role: Role | undefined, perm: keyof PermissionSet): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.[perm] ?? false;
}

export function roleLabel(role: string | undefined): string {
  if (!role) return 'User';
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Badge color variant per role, used in Users table */
export function roleBadgeVariant(role: string): 'danger' | 'info' | 'success' | 'default' {
  switch (role) {
    case 'system_admin':
      return 'danger';
    case 'trade_manager':
      return 'info';
    case 'finance_officer':
      return 'success';
    default:
      return 'default';
  }
}
