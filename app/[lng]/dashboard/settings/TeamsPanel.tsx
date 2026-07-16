'use client';

import { useState, useEffect } from 'react';
import { inviteTeamMember, removeTeamMember, getTeamMembers } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

interface TeamMember {
  email: string;
  role: 'member' | 'admin' | 'owner' | 'accountant' | 'viewer';
  invited_at: string;
  status?: 'accepted' | 'pending';
}

interface TeamsPanelProps {
  organizationId: string;
  locale?: string;
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

export default function TeamsPanel({ organizationId, locale = 'en' }: TeamsPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'accountant' | 'viewer'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // Load team members on mount
  useEffect(() => {
    const loadMembers = async () => {
      setIsLoadingMembers(true);
      const result = await getTeamMembers(organizationId);
      if (result.success) {
        setMembers(result.members);
      }
      setIsLoadingMembers(false);
    };
    loadMembers();
  }, [organizationId]);

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
        const membersResult = await getTeamMembers(organizationId);
        if (membersResult.success) {
          setMembers(membersResult.members);
        }
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
        setMembers(members.filter(m => m.email !== memberEmail));
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

  return (
    <div className="p-6 md:p-8 space-y-6">
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

      {/* Current Members List */}
      {!isLoadingMembers && members.length > 0 && (
        <div className="border-b border-gray-200 pb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            {isEs ? 'Miembros Actuales' : 'Current Members'} ({members.length})
          </p>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-gray-200 hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.email}</p>
                    <p className="text-xs text-slate-500">
                      {isEs ? 'Invitado el' : 'Invited'} {new Date(member.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap ${getRoleBadgeColor(
                      member.role
                    )}`}
                  >
                    {getRoleLabel(member.role)}
                  </span>
                  {member.status === 'pending' && (
                    <span className="text-xs font-bold px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 whitespace-nowrap">
                      {isEs ? 'Pendiente' : 'Pending'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveMember(member.email)}
                  disabled={deletingEmail === member.email}
                  className="ml-2 px-2 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded transition disabled:opacity-50"
                >
                  {deletingEmail === member.email ? (isEs ? 'Eliminando...' : 'Removing...') : (isEs ? 'Eliminar' : 'Remove')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Roles Reference */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isEs ? 'Roles Disponibles' : 'Available Roles'}
        </p>
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
      </div>

      {/* Invite Form */}
      <div className="border-t border-gray-200 pt-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {isEs ? 'Invitar Miembro' : 'Invite Member'}
        </p>
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

      {/* Info Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          <p className="text-xs text-slate-600">
            {isEs
              ? 'Los miembros invitados recibirán un correo con un enlace para aceptar la invitación y acceder a su equipo.'
              : 'Invited members will receive an email with a link to accept the invitation and access your team.'}
          </p>
        </div>
      </div>
    </div>
  );
}
