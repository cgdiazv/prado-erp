export const DASHBOARD_MODULES = ['customers', 'estimates', 'jobs', 'dispatch', 'invoice', 'expenses', 'settings'] as const;

export type DashboardModule = (typeof DASHBOARD_MODULES)[number];
export type DashboardPermissionRole = 'owner' | 'manager' | 'supervisor' | 'dispatcher' | 'billing' | 'subcontractor';
export type DashboardRolePermissionsMap = Record<DashboardPermissionRole, DashboardModule[]>;

const FULL_ACCESS_MODULES = [...DASHBOARD_MODULES];

export const DEFAULT_ROLE_MODULES: DashboardRolePermissionsMap = {
  owner: [...FULL_ACCESS_MODULES],
  manager: [...FULL_ACCESS_MODULES],
  supervisor: ['customers', 'estimates', 'jobs', 'invoice'],
  dispatcher: ['customers', 'jobs', 'dispatch'],
  billing: ['customers', 'invoice', 'expenses'],
  subcontractor: ['jobs', 'dispatch'],
};

const EDITABLE_ROLES = Object.keys(DEFAULT_ROLE_MODULES) as DashboardPermissionRole[];

export function sanitizeModules(modules: readonly string[] | null | undefined): DashboardModule[] {
  if (!Array.isArray(modules)) {
    return [];
  }

  return DASHBOARD_MODULES.filter((moduleId) => modules.includes(moduleId));
}

export function isDashboardModule(value: string): value is DashboardModule {
  return DASHBOARD_MODULES.includes(value as DashboardModule);
}

export function isEditableDashboardRole(value: string): value is DashboardPermissionRole {
  return EDITABLE_ROLES.includes(value as DashboardPermissionRole);
}

export function getDefaultModulesForRole(role: string | null | undefined): DashboardModule[] {
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole === 'owner') {
    return [...DEFAULT_ROLE_MODULES.owner];
  }

  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return [...DEFAULT_ROLE_MODULES.manager];
  }

  if (normalizedRole === 'supervisor' || normalizedRole === 'member') {
    return [...DEFAULT_ROLE_MODULES.supervisor];
  }

  if (normalizedRole === 'dispatcher') {
    return [...DEFAULT_ROLE_MODULES.dispatcher];
  }

  if (normalizedRole === 'billing' || normalizedRole === 'accountant') {
    return [...DEFAULT_ROLE_MODULES.billing];
  }

  if (normalizedRole === 'subcontractor') {
    return [...DEFAULT_ROLE_MODULES.subcontractor];
  }

  if (normalizedRole === 'viewer' || normalizedRole === 'guest') {
    return ['customers'];
  }

  return [...FULL_ACCESS_MODULES];
}