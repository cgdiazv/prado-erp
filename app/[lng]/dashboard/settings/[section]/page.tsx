import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ServicesPanel from '../ServicesPanel';
import TrucksPanel from '../TrucksPanel';
import ExpenseCategoriesPanel from '../ExpenseCategoriesPanel';
import TeamsPanel from '../TeamsPanel';
import SubscriptionCancellationCard from '../SubscriptionCancellationCard';
import WorkspaceIdentityForm from '../WorkspaceIdentityForm';
import XeroConnectionCard from '../XeroConnectionCard';
import QBOConnectionCard from '../QBOConnectionCard';
import StripeConnectSettings from '@/components/dashboard/StripeConnectSettings';
import { updateDispatchSettings } from '../actions';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';

const SECTION_IDS = [
  'profile-settings',
  'operations-settings',
  'team-settings',
  'integrations',
  'dispatch-settings',
  'manage-subscription',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

interface SectionLink {
  id: SectionId;
  label: string;
  href: string;
}

function isSectionId(value: string): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ lng?: string; section?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const translations = getTranslations(locale);
  const sectionParam = resolvedParams.section ?? '';

  if (sectionParam === 'payments') {
    redirect(`/${locale}/dashboard/settings/integrations`);
  }

  if (!isSectionId(sectionParam)) {
    redirect(`/${locale}/dashboard/settings/profile-settings`);
  }

  const section = sectionParam;
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

  const initial = org.name ? org.name.charAt(0) : 'C';
  const isIndividualAccount = org.subscription_status === 'individual';
  const canAccessStripeSettings = org.subscription_status === 'trial' || org.subscription_status === 'growth' || org.subscription_status === 'enterprise';
  const canAccessXeroSettings = org.subscription_status === 'trial' || org.subscription_status === 'enterprise';
  const normalizedRole = (role || '').toLowerCase();
  const isOwnerRole = normalizedRole === 'owner';
  const canViewImportExport = normalizedRole === 'owner' || normalizedRole === 'admin';
  const canManageIntegrations = canAccessStripeSettings && (normalizedRole === 'owner' || normalizedRole === 'admin');
  const canManageSubscription = isOwnerRole;

  if (section === 'team-settings' && isIndividualAccount) {
    redirect(`/${locale}/dashboard/settings/profile-settings`);
  }

  if (section === 'dispatch-settings' && isIndividualAccount) {
    redirect(`/${locale}/dashboard/settings/profile-settings`);
  }

  if (section === 'integrations' && !canManageIntegrations) {
    redirect(`/${locale}/dashboard/settings/profile-settings`);
  }

  if (section === 'manage-subscription' && !canManageSubscription) {
    redirect(`/${locale}/dashboard/settings/profile-settings`);
  }

  const sectionLinks: SectionLink[] = [
    {
      id: 'profile-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Configuracion de cuenta' : 'Account Settings',
      href: `/${locale}/dashboard/settings/profile-settings`,
    },
    {
      id: 'operations-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Configuracion de operaciones' : 'Operations Settings',
      href: `/${locale}/dashboard/settings/operations-settings`,
    },
  ];

  if (!isIndividualAccount) {
    sectionLinks.push({
      id: 'team-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Configuracion de equipo' : 'Team Settings',
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

  if (!isIndividualAccount) {
    sectionLinks.push({
      id: 'dispatch-settings',
      label: locale.toLowerCase().startsWith('es') ? 'Despacho' : 'Dispatch',
      href: `/${locale}/dashboard/settings/dispatch-settings`,
    });
  }

  if (canManageSubscription) {
    sectionLinks.push({
      id: 'manage-subscription',
      label: locale.toLowerCase().startsWith('es') ? 'Administrar suscripcion' : 'Manage Subscription',
      href: `/${locale}/dashboard/settings/manage-subscription`,
    });
  }

  let services: Array<{
    id: string;
    name: string;
    description: string | null;
    base_price: number | null;
    is_recurring_default: boolean | null;
    recurrence_interval_days: number | null;
    auto_charge_default: boolean | null;
  }> = [];
  let trucks: Array<{ id: string; name: string; plate_number: string | null; is_active: boolean; status: string | null }> = [];

  if (section === 'operations-settings') {
    const [{ data: serviceRows }, { data: truckRows }] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, description, base_price, is_recurring_default, recurrence_interval_days, auto_charge_default')
        .eq('organization_id', org.id)
        .not('name', 'like', `${ARCHIVED_SERVICE_PREFIX}%`)
        .order('name', { ascending: true }),
      supabase
        .from('trucks')
        .select('id, name, plate_number, is_active, status')
        .eq('organization_id', org.id)
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ]);

    services = serviceRows || [];
    trucks = truckRows || [];
  }

  const looksLikeZip = (value: string) => /^\d{5}(?:-\d{4})?$/.test(value.trim());
  const looksLikeStateCode = (value: string) => /^[A-Za-z]{2}$/.test(value.trim());
  const looksLikeStreet = (value: string) => /\d/.test(value) && /[A-Za-z]/.test(value);
  const looksLikePhone = (value: string) => /^[+()\d\s.-]{7,}$/.test(value.trim());

  const rawPhone = org.phone || '';
  const rawStreet = org.street_address || '';
  const rawCity = org.city || '';
  const rawState = org.state || '';
  const rawZip = org.zip_code || '';

  const hasShiftedIdentityValues =
    !looksLikePhone(rawPhone) &&
    looksLikeStreet(rawPhone) &&
    rawStreet.length > 0 &&
    looksLikeStateCode(rawCity) &&
    looksLikeZip(rawState) &&
    !looksLikeZip(rawZip);

  const normalizedPhone = hasShiftedIdentityValues ? '' : rawPhone;
  const normalizedStreetAddress = hasShiftedIdentityValues ? rawPhone : rawStreet;
  const normalizedCity = hasShiftedIdentityValues ? rawStreet : rawCity;
  const normalizedState = hasShiftedIdentityValues ? rawCity : rawState;
  const normalizedZipCode = hasShiftedIdentityValues ? rawState : rawZip;

  return (
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-6 md:px-10 pt-10 pb-8 space-y-8 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.accountWorkspaceSettings}</h1>
                <p className="text-xs text-slate-500 font-medium">{translations.dashboard.accountWorkspaceSettingsDescription}</p>
              </div>
            </div>

            <nav className="-mt-3 overflow-x-auto pb-1">
              <div className="flex min-w-max items-center gap-2">
                {sectionLinks.map((link) => {
                  const isActive = link.id === section;
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {section === 'profile-settings' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <WorkspaceIdentityForm
                    companyName={org.name || ''}
                    systemEmail={user.email || ''}
                    initialLogoUrl={org.logo_url || ''}
                    initialSlogan={org.slogan || ''}
                    initialPhone={normalizedPhone}
                    initialStreetAddress={normalizedStreetAddress}
                    initialCity={normalizedCity}
                    initialState={normalizedState}
                    initialZipCode={normalizedZipCode}
                    locale={locale}
                    showOwnerFields={isOwnerRole}
                  />
                </div>
              </>
            )}

            {section === 'operations-settings' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <ServicesPanel initialServices={services} locale={locale} />
                </div>

                {!isIndividualAccount && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <TrucksPanel initialTrucks={trucks} locale={locale} />
                  </div>
                )}

                {!isIndividualAccount && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <ExpenseCategoriesPanel locale={locale} />
                  </div>
                )}
              </>
            )}

            {section === 'team-settings' && !isIndividualAccount && (
              <TeamsPanel
                organizationId={org.id}
                locale={locale}
                subscriptionStatus={org.subscription_status || null}
                currentUserRole={normalizedRole || null}
              />
            )}

            {section === 'integrations' && canManageIntegrations && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <StripeConnectSettings
                    locale={locale}
                    initialStripeAccountId={org.stripe_account_id || null}
                    initialChargesEnabled={Boolean(org.stripe_account_charges_enabled)}
                    initialPayoutsEnabled={Boolean(org.stripe_account_payouts_enabled)}
                  />
                </div>

                {canAccessXeroSettings ? (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                      <QBOConnectionCard organizationId={org.id} />
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                      <XeroConnectionCard organizationId={org.id} />
                    </div>
                  </>
                ) : null}
              </>
            )}

            {section === 'dispatch-settings' && !isIndividualAccount && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.dispatchSettings}</h3>
                    <p className="text-xs text-slate-400">{translations.dashboard.dispatchSettingsDescription}</p>
                  </div>

                  <form action={updateDispatchSettings} className="space-y-4">
                    <input type="hidden" name="locale" value={locale} />
                    <div className="flex items-start gap-3">
                      <input
                        type="hidden"
                        name="autoOptimizeDriveRoutes"
                        value="false"
                      />
                      <input
                        id="optimize-paths"
                        type="checkbox"
                        name="autoOptimizeDriveRoutes"
                        value="true"
                        defaultChecked={org.auto_optimize_drive_routes ?? true}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <label htmlFor="optimize-paths" className="text-sm font-semibold text-slate-800 block">
                          {translations.dashboard.autoOptimizeDriveRoutes}
                        </label>
                        <span className="text-xs text-slate-400">{translations.dashboard.autoOptimizeDescription}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="max-jobs-per-truck" className="block text-xs font-semibold text-gray-500 uppercase">
                        {translations.dashboard.routeMaxStops}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="max-jobs-per-truck"
                          type="number"
                          name="maxJobsPerTruck"
                          min={1}
                          max={100}
                          defaultValue={org.max_jobs_per_truck ?? 4}
                          className="w-32 rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm"
                        >
                          Update Dispatch Settings
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        {locale.toLowerCase().startsWith('es')
                          ? 'Define el umbral de sobrecarga para alertas y planificacion de rutas por camion.'
                          : 'Defines the overload threshold for route planning and truck capacity alerts.'}
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {section === 'manage-subscription' && canManageSubscription && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <SubscriptionCancellationCard currentSubscriptionStatus={org.subscription_status} locale={locale} />
                </div>

                <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
                  <div className="p-6 md:p-8 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-1">{translations.dashboard.deleteAccountTitle}</h3>
                      <p className="text-xs text-slate-400">{translations.dashboard.deleteAccountDescription}</p>
                    </div>

                    <form action={`/${locale}/auth/delete-account`} method="POST">
                      <button
                        type="submit"
                        className="text-xs font-semibold px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-300 transition"
                      >
                        {translations.dashboard.deleteAccountButton}
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
    </main>
  );
}
