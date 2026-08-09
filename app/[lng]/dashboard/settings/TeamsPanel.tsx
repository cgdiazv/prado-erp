'use client';

import { useState, useEffect } from 'react';
import { inviteTeamMember, removeTeamMember, getTeamMembers, saveOrganizationRolePermissions } from '@/app/actions';
import { DASHBOARD_MODULES, DEFAULT_ROLE_MODULES, type DashboardRolePermissionsMap } from '@/lib/dashboardRolePermissions';
import { getTranslations } from '@/lib/translations';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabaseClient';

interface TeamMember {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  last_login_at?: string | null;
  role: 'owner' | 'manager' | 'supervisor' | 'dispatcher' | 'billing';
  invited_at: string;
  status?: 'accepted' | 'pending';
}

interface TeamsPanelProps {
  organizationId: string;
  locale?: string;
  subscriptionStatus?: string | null;
  currentUserRole?: string | null;
  initialRolePermissions?: DashboardRolePermissionsMap;
}

const USER_ROLES = [
  {
    id: 'owner',
  },
  {
    id: 'manager',
  },
  {
    id: 'supervisor',
  },
  {
    id: 'dispatcher',
  },
  {
    id: 'billing',
  }
];

export default function TeamsPanel({ organizationId, locale = 'en', subscriptionStatus = null, currentUserRole = null, initialRolePermissions }: TeamsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('owner');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const normalizedInitialRole = currentUserRole ? String(currentUserRole).toLowerCase() : null;
  const [isResolvingRole, setIsResolvingRole] = useState(!normalizedInitialRole);
  const [resolvedUserRole, setResolvedUserRole] = useState<string | null>(normalizedInitialRole);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<DashboardRolePermissionsMap>(() => ({
    owner: [...(initialRolePermissions?.owner || DEFAULT_ROLE_MODULES.owner)],
    manager: [...(initialRolePermissions?.manager || DEFAULT_ROLE_MODULES.manager)],
    supervisor: [...(initialRolePermissions?.supervisor || DEFAULT_ROLE_MODULES.supervisor)],
    dispatcher: [...(initialRolePermissions?.dispatcher || DEFAULT_ROLE_MODULES.dispatcher)],
    billing: [...(initialRolePermissions?.billing || DEFAULT_ROLE_MODULES.billing)],
  }));
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TeamMember['role'] | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [isSavingRolePermissions, setIsSavingRolePermissions] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const loadMembers = async (showLoading = false) => {
    if (showLoading) {
      setIsLoadingMembers(true);
    }

    const result = await getTeamMembers(organizationId);
    if (result.success) {
      setMembers(result.members);
    }

    if (showLoading) {
      setIsLoadingMembers(false);
    }
  };

  const normalizedCurrentUserRole = (resolvedUserRole || '').toLowerCase();
  const canViewTeamTables = normalizedCurrentUserRole === 'owner' || normalizedCurrentUserRole === 'admin' || normalizedCurrentUserRole === 'manager';

  useEffect(() => {
    if (normalizedInitialRole) {
      setResolvedUserRole(normalizedInitialRole);
      setIsResolvingRole(false);
      return;
    }

    const resolveCurrentUserRole = async () => {
      setIsResolvingRole(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setResolvedUserRole(null);
          return;
        }

        const { data: membership } = await supabase
          .from('organization_users')
          .select('role')
          .eq('organization_id', organizationId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (membership?.role) {
          setResolvedUserRole(String(membership.role).toLowerCase());
          return;
        }

        const { data: orgData } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', organizationId)
          .maybeSingle();

        setResolvedUserRole(orgData?.owner_id === user.id ? 'owner' : null);
      } catch (error) {
        console.error('Failed to resolve team panel role:', error);
        setResolvedUserRole(null);
      } finally {
        setIsResolvingRole(false);
      }
    };

    resolveCurrentUserRole();
  }, [organizationId, normalizedInitialRole, supabase]);

  // Load team members for owner/manager on mount and subscribe to live updates.
  useEffect(() => {
    if (isResolvingRole) {
      return;
    }

    loadMembers(true);

    const channel = supabase
      .channel(`team-members-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_users',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          loadMembers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_invitations',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          loadMembers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    const handleWindowFocus = () => {
      loadMembers();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      supabase.removeChannel(channel);
    };
  }, [organizationId, canViewTeamTables, isResolvingRole]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await inviteTeamMember({
        organizationId,
        email,
        role,
      });

      if (result.success) {
        setMessage(result.message || 'Invitation sent successfully!');
        setEmail('');
        setRole('owner');
        
        // Reload members list
        await loadMembers();
      } else {
        setError(result.error || 'Failed to send invitation.');
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberEmail: string) => {
    setDeletingEmail(memberEmail);
    try {
      const result = await removeTeamMember(organizationId, memberEmail);
      if (result.success) {
        await loadMembers();
        setMessage(`${memberEmail} removed from the team.`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(result.error || 'Failed to remove member.');
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred.');
    } finally {
      setDeletingEmail(null);
    }
  };

  const getRoleLabel = (roleId: string) => {
    const labels: Record<string, string> = isEs
      ? {
          owner: 'Admin/Propietario',
          manager: 'Gerente',
          supervisor: 'Supervisor',
          dispatcher: 'Despachador',
          billing: 'Facturación',
        }
      : {
          owner: 'Admin/Owner',
          manager: 'Manager',
          supervisor: 'Supervisor',
          dispatcher: 'Dispatcher',
          billing: 'Billing',
        };

    return labels[roleId] || roleId;
  };

  const getRoleDescription = (roleId: string) => {
    const descriptions: Record<string, string> = isEs
      ? {
          owner: 'Acceso total. Gestiona facturación, equipo y toda la configuración.',
          manager: 'Puede gestionar miembros del equipo, configuración y ver todos los datos.',
          supervisor: 'Puede editar y crear órdenes de trabajo, estimaciones y datos de clientes.',
          dispatcher: 'Puede programar trabajos, asignar recursos y ver datos relacionados.',
          billing: 'Puede ver datos y gestionar facturación y registros financieros.',
        }
      : {
          owner: 'Full access. Manages billing, team, and all settings.',
          manager: 'Can manage team members, settings, and view all data.',
          supervisor: 'Can edit and create work orders, estimates, and customer data.',
          dispatcher: 'Can schedule jobs, assign resources, and view related data.',
          billing: 'Can view data and manage billing and financial records.',
        };

    return descriptions[roleId] || '';
  };

  const getModuleLabel = (moduleId: string) => {
    const labels: Record<string, string> = isEs
      ? {
          customers: 'Módulo de Clientes',
          estimates: 'Módulo de Estimados',
          jobs: 'Módulo de Trabajos',
          dispatch: 'Módulo de Despacho',
          invoice: 'Módulo de Facturas',
          expenses: 'Módulo de Gastos',
          settings: 'Módulo de Configuración',
        }
      : {
          customers: 'Customers module',
          estimates: 'Estimates module',
          jobs: 'Jobs module',
          dispatch: 'Dispatch module',
          invoice: 'Invoice module',
          expenses: 'Expenses module',
          settings: 'Settings module',
        };

    return labels[moduleId] || moduleId;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'supervisor':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'dispatcher':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'billing':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const acceptedMembers = members.filter((member) => member.status !== 'pending');

  const formatLastLogin = (value?: string | null) => {
    if (!value) return isEs ? 'Nunca' : 'Never';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return isEs ? 'Nunca' : 'Never';
    return parsed.toLocaleString(isEs ? 'es-ES' : 'en-US');
  };

  const allPermissions = [...DASHBOARD_MODULES];

  const openRoleModal = (roleId: TeamMember['role']) => {
    setEditingRole(roleId);
    setDraftPermissions([...(rolePermissions[roleId] || [])]);
    setIsRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
    setDraftPermissions([]);
  };

  const toggleDraftPermission = (permission: string) => {
    setDraftPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((value) => value !== permission)
        : [...prev, permission]
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;

    setIsSavingRolePermissions(true);
    setError('');

    try {
      const result = await saveOrganizationRolePermissions({
        organizationId,
        role: editingRole,
        modules: draftPermissions,
        locale,
      });

      if (!result.success) {
        setError(result.error || (isEs ? 'No se pudieron guardar los permisos.' : 'Failed to save role permissions.'));
        return;
      }

      setRolePermissions((prev: DashboardRolePermissionsMap) => ({
        ...prev,
        [editingRole]: [...(result.modules || draftPermissions)],
      }));
      setMessage(
        isEs
          ? `Permisos actualizados para ${getRoleLabel(editingRole)}.`
          : `Permissions updated for ${getRoleLabel(editingRole)}.`
      );
      closeRoleModal();
    } catch (err) {
      setError((err as Error).message || (isEs ? 'No se pudieron guardar los permisos.' : 'Failed to save role permissions.'));
    } finally {
      setIsSavingRolePermissions(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
        <div className="space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                {isEs ? 'Equipo' : 'Team'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEs
                  ? 'Invita miembros del equipo y gestiona sus permisos y roles.'
                  : 'Invite team members and manage their permissions and roles.'}
              </p>
            </div>

            {/* Invite Form */}
            {canViewTeamTables ? (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  {isEs ? 'Invitar Miembro' : 'Invite Member'}
                </p>

                {(subscriptionStatus === 'growth' || subscriptionStatus === 'enterprise') && (
                  <p className="text-xs text-slate-500 mb-3">
                    {subscriptionStatus === 'growth'
                      ? (isEs ? 'Plan Growth: hasta 5 usuarios en total (incluye al propietario).' : 'Growth tier: up to 5 total users (including the owner).')
                      : (isEs ? 'Plan Enterprise: miembros ilimitados.' : 'Enterprise tier: unlimited members.')}
                  </p>
                )}

                <form onSubmit={handleInvite} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder={isEs ? 'correo@ejemplo.com' : 'email@example.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TeamMember['role'])}
                    className="rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="owner">{isEs ? 'Admin/Propietario' : 'Admin/Owner'}</option>
                    <option value="manager">{isEs ? 'Gerente' : 'Manager'}</option>
                    <option value="supervisor">{isEs ? 'Supervisor' : 'Supervisor'}</option>
                    <option value="dispatcher">{isEs ? 'Despachador' : 'Dispatcher'}</option>
                    <option value="billing">{isEs ? 'Facturación' : 'Billing'}</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-xs font-bold rounded-lg transition shadow-sm"
                  >
                    {isLoading ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Invitar' : 'Invite')}
                  </button>
                </div>

                {/* Messages */}
                {message && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded">
                    {message}
                  </div>
                )}
                {error && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded">
                    {error}
                  </div>
                )}
                </form>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roles &amp; Permission</p>
              <p className="text-xs text-slate-400 mt-1">Configure module actions and permissions for dashboard roles.</p>
            </div>

            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {USER_ROLES.map((roleItem) => {
                const roleId = roleItem.id as TeamMember['role'];
                return (
                  <div key={roleItem.id} className="p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{getRoleLabel(roleItem.id)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{getRoleDescription(roleItem.id)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRoleModal(roleId)}
                      disabled={!canViewTeamTables}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {canViewTeamTables ? (
        <>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isEs ? 'Miembros Actuales' : 'Current Members'} ({acceptedMembers.length})
            </p>

            {isLoadingMembers ? (
              <p className="text-xs text-slate-500">{isEs ? 'Cargando miembros...' : 'Loading members...'}</p>
            ) : (
              <div className="border border-gray-200 bg-white rounded-xl overflow-hidden shadow-xs">
                <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Nombre' : 'Name'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Apellido' : 'Last Name'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Correo' : 'Email Address'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Telefono' : 'Phone Number'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Permiso' : 'Permission Type'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Ultimo acceso' : 'Last Login'}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Accion' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {acceptedMembers.length === 0 ? (
                  <tr className="border-t border-gray-100">
                    <td colSpan={7} className="py-6 px-3 text-sm text-slate-500 text-center">
                      {isEs ? 'No hay miembros activos todavia.' : 'No active members yet.'}
                    </td>
                  </tr>
                ) : (
                  acceptedMembers.map((member) => (
                    <tr key={member.email} className="border-t border-gray-100 hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-sm text-gray-800">{member.first_name?.trim() || '—'}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">{member.last_name?.trim() || '—'}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">{member.email}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">{member.phone?.trim() || '—'}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">
                        <span className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap ${getRoleBadgeColor(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">{formatLastLogin(member.last_login_at)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {member.role === 'owner' ? (
                          <span className="text-xs font-semibold text-red-600">
                            {isEs ? 'Usa Eliminar cuenta' : 'Use Delete Account'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoveMember(member.email)}
                            disabled={deletingEmail === member.email}
                            className="px-2 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded transition disabled:opacity-50"
                          >
                            {deletingEmail === member.email ? (isEs ? 'Eliminando...' : 'Removing...') : (isEs ? 'Eliminar' : 'Remove')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
                </table>
              </div>
            )}

          </div>

        </>
      ) : !isResolvingRole ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {isEs
            ? 'Solo propietario y gerente pueden ver la tabla de miembros.'
            : 'Only owner and manager can view the member table.'}
        </div>
      ) : null}

      {isRoleModalOpen && editingRole ? (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-900">{getRoleLabel(editingRole)}</p>
              <p className="text-xs text-slate-500 mt-1">{isEs ? 'Configura permisos por módulo.' : 'Configure module permissions.'}</p>
            </div>

            <div className="px-5 py-4 space-y-2 max-h-[55vh] overflow-y-auto">
              {allPermissions.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draftPermissions.includes(permission)}
                    onChange={() => toggleDraftPermission(permission)}
                    disabled={isSavingRolePermissions}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{getModuleLabel(permission)}</span>
                </label>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRoleModal}
                disabled={isSavingRolePermissions}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveRolePermissions}
                disabled={isSavingRolePermissions}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSavingRolePermissions ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
