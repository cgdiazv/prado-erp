'use client';

import { useState, useEffect } from 'react';
import { inviteTeamMember, removeTeamMember, getTeamMembers } from '@/app/actions';
import { getTranslations } from '@/lib/translations';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabaseClient';

interface TeamMember {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  last_login_at?: string | null;
  role: 'member' | 'admin' | 'owner' | 'accountant' | 'viewer';
  invited_at: string;
  status?: 'accepted' | 'pending';
}

interface TeamsPanelProps {
  organizationId: string;
  locale?: string;
  subscriptionStatus?: string | null;
  currentUserRole?: string | null;
}

const USER_ROLES = [
  {
    id: 'owner',
    permissions: ['manage_team', 'manage_billing', 'manage_settings', 'edit_data', 'view_data']
  },
  {
    id: 'admin',
    permissions: ['manage_team', 'manage_settings', 'edit_data', 'view_data']
  },
  {
    id: 'member',
    permissions: ['edit_data', 'view_data']
  },
  {
    id: 'accountant',
    permissions: ['manage_billing', 'view_data']
  },
  {
    id: 'viewer',
    permissions: ['view_data']
  }
];

export default function TeamsPanel({ organizationId, locale = 'en', subscriptionStatus = null, currentUserRole = null }: TeamsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'accountant' | 'viewer'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const normalizedInitialRole = currentUserRole ? String(currentUserRole).toLowerCase() : null;
  const [isResolvingRole, setIsResolvingRole] = useState(!normalizedInitialRole);
  const [resolvedUserRole, setResolvedUserRole] = useState<string | null>(normalizedInitialRole);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [showRolesReference, setShowRolesReference] = useState(false);
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
  const canViewTeamTables =
    normalizedCurrentUserRole === 'owner' ||
    normalizedCurrentUserRole === 'admin' ||
    normalizedCurrentUserRole === 'manager';

  useEffect(() => {
    if (normalizedInitialRole) {
      setResolvedUserRole(normalizedInitialRole);
      setIsResolvingRole(false);
      return;
    }

    const resolveCurrentUserRole = async () => {
      setIsResolvingRole(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setResolvedUserRole(null);
        setIsResolvingRole(false);
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
        setIsResolvingRole(false);
        return;
      }

      const { data: orgData } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', organizationId)
        .maybeSingle();

      setResolvedUserRole(orgData?.owner_id === user.id ? 'owner' : null);
      setIsResolvingRole(false);
    };

    resolveCurrentUserRole();
  }, [organizationId, normalizedInitialRole, supabase]);

  // Load team members for owner/manager on mount and subscribe to live updates.
  useEffect(() => {
    if (isResolvingRole) {
      return;
    }

    if (!canViewTeamTables) {
      setIsLoadingMembers(false);
      setMembers([]);
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
        setRole('member');
        
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
          owner: 'Propietario',
          admin: 'Gestor',
          member: 'Supervisor',
          accountant: 'Contador',
          viewer: 'Invitado',
        }
      : {
          owner: 'Owner',
          admin: 'Manager',
          member: 'Supervisor',
          accountant: 'Accountant',
          viewer: 'Guest',
        };

    return labels[roleId] || roleId;
  };

  const getRoleDescription = (roleId: string) => {
    const descriptions: Record<string, string> = isEs
      ? {
          owner: 'Acceso total. Gestiona facturacion, equipo y toda la configuracion.',
          admin: 'Puede gestionar miembros del equipo, configuracion y ver todos los datos.',
          member: 'Puede editar y crear ordenes de trabajo, estimaciones y datos de clientes.',
          accountant: 'Puede ver datos y gestionar facturacion y registros financieros.',
          viewer: 'Acceso de solo lectura a paneles e informes.',
        }
      : {
          owner: 'Full access. Manages billing, team, and all settings.',
          admin: 'Can manage team members, settings, and view all data.',
          member: 'Can edit and create work orders, estimates, and customer data.',
          accountant: 'Can view data and manage billing and financial records.',
          viewer: 'Read-only access to dashboards and reports.',
        };

    return descriptions[roleId] || '';
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = isEs
      ? {
          manage_team: 'Gestionar equipo',
          manage_billing: 'Gestionar facturacion',
          manage_settings: 'Gestionar configuracion',
          edit_data: 'Editar datos',
          view_data: 'Ver datos',
        }
      : {
          manage_team: 'Manage team',
          manage_billing: 'Manage billing',
          manage_settings: 'Manage settings',
          edit_data: 'Edit data',
          view_data: 'View data',
        };

    return labels[permission] || permission.replace('_', ' ');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'member':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'accountant':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const acceptedMembers = members.filter((member) => member.status !== 'pending');
  const pendingInvites = members.filter((member) => member.status === 'pending');

  const formatLastLogin = (value?: string | null) => {
    if (!value) return isEs ? 'Nunca' : 'Never';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return isEs ? 'Nunca' : 'Never';
    return parsed.toLocaleString(isEs ? 'es-ES' : 'en-US');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
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

        {/* User Roles Reference */}
        <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isEs ? 'Roles Disponibles' : 'Available Roles'}
          </p>
          <button
            type="button"
            onClick={() => setShowRolesReference((prev) => !prev)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-600"
          >
            {showRolesReference ? (isEs ? 'Ocultar' : 'Hide') : (isEs ? 'Mostrar' : 'Show')}
          </button>
        </div>
        {showRolesReference && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {USER_ROLES.map((userRole) => (
              <div
                key={userRole.id}
                className="border border-gray-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{getRoleLabel(userRole.id)}</h4>
                    <p className="text-xs text-slate-500 mt-1">{getRoleDescription(userRole.id)}</p>
                  </div>
                  {userRole.id === 'owner' && (
                    <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      {isEs ? 'Predeterminado' : 'Default'}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {userRole.permissions.map((perm) => (
                    <span key={perm} className="text-[10px] bg-white text-slate-600 border border-gray-200 px-1.5 py-0.5 rounded">
                      {getPermissionLabel(perm)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
                onChange={(e) => setRole(e.target.value as 'member' | 'admin' | 'accountant' | 'viewer')}
                className="rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="member">{isEs ? 'Supervisor' : 'Supervisor'}</option>
                <option value="admin">{isEs ? 'Gestor' : 'Manager'}</option>
                <option value="accountant">{isEs ? 'Contador' : 'Accountant'}</option>
                <option value="viewer">{isEs ? 'Invitado' : 'Guest'}</option>
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
                        <button
                          onClick={() => handleRemoveMember(member.email)}
                          disabled={deletingEmail === member.email}
                          className="px-2 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded transition disabled:opacity-50"
                        >
                          {deletingEmail === member.email ? (isEs ? 'Eliminando...' : 'Removing...') : (isEs ? 'Eliminar' : 'Remove')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
                </table>
              </div>
            )}

          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isEs ? 'Invitaciones Pendientes' : 'Pending Invitations'} ({pendingInvites.length})
            </p>

            {isLoadingMembers ? (
              <p className="text-xs text-slate-500">{isEs ? 'Cargando invitaciones...' : 'Loading invitations...'}</p>
            ) : (
              <div className="border border-gray-200 bg-white rounded-xl overflow-hidden shadow-xs">
                <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Correo' : 'Email Address'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Permiso' : 'Permission Type'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Invitado el' : 'Invited At'}</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Estado' : 'Status'}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500">{isEs ? 'Accion' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.length === 0 ? (
                  <tr className="border-t border-gray-100">
                    <td colSpan={5} className="py-6 px-3 text-sm text-slate-500 text-center">
                      {isEs ? 'No hay invitaciones pendientes.' : 'No pending invitations.'}
                    </td>
                  </tr>
                ) : (
                  pendingInvites.map((invite) => (
                    <tr key={invite.email} className="border-t border-gray-100 hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-sm text-gray-800">{invite.email}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">
                        <span className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap ${getRoleBadgeColor(invite.role)}`}>
                          {getRoleLabel(invite.role)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">
                        {new Date(invite.invited_at).toLocaleString(isEs ? 'es-ES' : 'en-US')}
                      </td>
                      <td className="py-2.5 px-3 text-sm text-gray-800">
                        <span className="text-xs font-bold px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap">
                          {isEs ? 'Pendiente' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRemoveMember(invite.email)}
                          disabled={deletingEmail === invite.email}
                          className="px-2 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded transition disabled:opacity-50"
                        >
                          {deletingEmail === invite.email ? (isEs ? 'Eliminando...' : 'Removing...') : (isEs ? 'Cancelar' : 'Cancel')}
                        </button>
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
            ? 'Solo propietario y gestor pueden ver tablas de miembros e invitaciones pendientes.'
            : 'Only owner and manager can view member and pending invitation tables.'}
        </div>
      ) : null}

    </div>
  );
}
