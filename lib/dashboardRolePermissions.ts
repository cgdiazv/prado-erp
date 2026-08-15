import { cache } from 'react';
import { createAdminClient } from '@/lib/supabaseAdmin';
import {
  type DashboardModule,
  DASHBOARD_MODULES,
  type DashboardRolePermissionsMap,
  DEFAULT_ROLE_MODULES,
  getDefaultModulesForRole,
  isDashboardModule,
  isEditableDashboardRole,
  sanitizeModules,
} from './dashboardRolePermissions.config';

export * from './dashboardRolePermissions.config';

const loadStoredRolePermissions = cache(async (organizationId: string) => {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('organization_role_permissions')
    .select('role, modules')
    .eq('organization_id', organizationId);

  if (error) {
    return {
      rows: [] as Array<{ role: string; modules: string[] | null }> ,
      error,
    };
  }

  return {
    rows: (data || []) as Array<{ role: string; modules: string[] | null }>,
    error: null,
  };
});

export async function getOrganizationRolePermissions(organizationId: string): Promise<DashboardRolePermissionsMap> {
  const merged: DashboardRolePermissionsMap = {
    owner: [...DEFAULT_ROLE_MODULES.owner],
    manager: [...DEFAULT_ROLE_MODULES.manager],
    supervisor: [...DEFAULT_ROLE_MODULES.supervisor],
    dispatcher: [...DEFAULT_ROLE_MODULES.dispatcher],
    billing: [...DEFAULT_ROLE_MODULES.billing],
    subcontractor: [...DEFAULT_ROLE_MODULES.subcontractor],
  };

  const { rows, error } = await loadStoredRolePermissions(organizationId);
  if (error) {
    return merged;
  }

  rows.forEach((row) => {
    if (!isEditableDashboardRole(row.role)) {
      return;
    }

    merged[row.role] = sanitizeModules(row.modules);
  });

  return merged;
}

export async function getAllowedDashboardModules(organizationId: string, role: string | null | undefined): Promise<DashboardModule[]> {
  const normalizedRole = String(role || '').toLowerCase();

  if (!normalizedRole) {
    return [];
  }

  if (normalizedRole === 'admin' || normalizedRole === 'member' || normalizedRole === 'accountant' || normalizedRole === 'viewer' || normalizedRole === 'guest') {
    return getDefaultModulesForRole(normalizedRole);
  }

  if (!isEditableDashboardRole(normalizedRole)) {
    return getDefaultModulesForRole(normalizedRole);
  }

  const permissionsMap = await getOrganizationRolePermissions(organizationId);
  return permissionsMap[normalizedRole];
}

export async function hasDashboardModuleAccess(
  organizationId: string,
  role: string | null | undefined,
  moduleId: DashboardModule
): Promise<boolean> {
  const allowedModules = await getAllowedDashboardModules(organizationId, role);
  return allowedModules.includes(moduleId);
}