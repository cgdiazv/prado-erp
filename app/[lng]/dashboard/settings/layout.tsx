import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import SettingsSidebar, { SectionLink } from './SettingsSidebar';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import {
  canUseDispatchEngine,
  canUseOnlineInvoicePayments,
  canUseTeamFeatures,
  normalizeSubscriptionStatus,
} from '@/lib/subscriptionAccess';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const translations = getTranslations(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { organization: org, role } = await getUserOrganization(user.id);

  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const canAccessSettingsModule = await hasDashboardModuleAccess(org.id, role, 'settings');
  if (!canAccessSettingsModule) {
    redirect(`/${locale}/dashboard`);
  }

  const tier = normalizeSubscriptionStatus(org.subscription_status);
  const canAccessTeamFeatures = canUseTeamFeatures(tier);
  const canAccessDispatchSettings = canUseDispatchEngine(tier);
  const canAccessStripeSettings = canUseOnlineInvoicePayments(tier);
  const normalizedRole = (role || '').toLowerCase();
  const isOwnerRole = normalizedRole === 'owner';
  const canManageIntegrations = canAccessStripeSettings && (normalizedRole === 'owner' || normalizedRole === 'admin');
  const canManageSubscription = isOwnerRole;

  const sectionLinks: SectionLink[] = [
    {
      id: 'account-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Configuración de cuenta' : 'Account Settings',
      href: `/${locale}/dashboard/settings/account-settings`,
    },
    {
      id: 'operations-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Configuración de operaciones' : 'Operations Settings',
      href: `/${locale}/dashboard/settings/operations-settings`,
    },
    {
      id: 'document-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Documentos y correos' : 'Documents & Emails',
      href: `/${locale}/dashboard/settings/document-settings`,
    },
  ];

  if (canAccessTeamFeatures) {
    sectionLinks.push({
      id: 'team-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Configuración de equipo' : 'Team Settings',
      href: `/${locale}/dashboard/settings/team-settings`,
    });
  }

  if (canManageIntegrations) {
    sectionLinks.push({
      id: 'integrations',
      label: locale.toLowerCase().startsWith('es') ? 'Integraciones' : 'Integrations',
      href: `/${locale}/dashboard/settings/integrations`,
    });
  }

  if (canAccessDispatchSettings) {
    sectionLinks.push({
      id: 'dispatch-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Despacho' : 'Dispatch',
      href: `/${locale}/dashboard/settings/dispatch-settings`,
    });
  }

  if (canManageSubscription) {
    sectionLinks.push({
      id: 'manage-subscription',
      label: locale.toLowerCase().startsWith('es') ? 'Administrar suscripción' : 'Manage Subscription',
      href: `/${locale}/dashboard/settings/manage-subscription`,
    });
  }

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 space-y-8 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {translations.dashboard.accountWorkspaceSettings}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {translations.dashboard.accountWorkspaceSettingsDescription}
            </p>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <SettingsSidebar links={sectionLinks} locale={locale} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
