import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import OperationsSettingsTabs from '../OperationsSettingsTabs';
import TeamsPanel from '../TeamsPanel';
import SubscriptionCancellationCard from '../SubscriptionCancellationCard';
import DeleteAccountSurveyCard from '../DeleteAccountSurveyCard';
import ReferralProgramCard from '../ReferralProgramCard';
import WorkspaceIdentityForm from '../WorkspaceIdentityForm';
import InvoiceTaxSettingsPanel from '../InvoiceTaxSettingsPanel';
import LaborMarkupSettingsPanel from '../LaborMarkupSettingsPanel';
import DocumentBrandingSettingsPanel from '../DocumentBrandingSettingsPanel';
import XeroConnectionCard from '../XeroConnectionCard';
import QBOConnectionCard from '../QBOConnectionCard';
import StripeConnectSettings from '@/components/dashboard/StripeConnectSettings';
import ImportExportPanel from '../ImportExportPanel';
import DispatchSettingsPanel from '../DispatchSettingsPanel';
import { getOrganizationRolePermissions, hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import {
  canUseAccountingIntegrations,
  canUseDispatchEngine,
  canUseOnlineInvoicePayments,
  canUseTeamFeatures,
  normalizeSubscriptionStatus,
} from '@/lib/subscriptionAccess';
import { getTranslations } from '@/lib/translations';
import { getUserOrganization } from '@/lib/organization';


const SECTION_IDS = [
  'account-settings',
  'operations-settings',
  'document-settings',
  'team-settings',
  'integrations',
  'dispatch-settings',
  'import-export',
  'manage-subscription',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

function isSectionId(value: string): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}

export default async function SettingsSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string; section?: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTab = typeof resolvedSearchParams?.tab === 'string' ? resolvedSearchParams.tab : undefined;
  const locale = resolvedParams.lng ?? 'en';
  const translations = getTranslations(locale);
  const sectionParam = resolvedParams.section ?? '';

  if (sectionParam === 'payments') {
    redirect(`/${locale}/dashboard/settings/integrations`);
  }

  if (!isSectionId(sectionParam)) {
    redirect(`/${locale}/dashboard/settings/account-settings`);
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

  const canAccessSettingsModule = await hasDashboardModuleAccess(org.id, role, 'settings');
  if (!canAccessSettingsModule) {
    redirect(`/${locale}/dashboard`);
  }

  const tier = normalizeSubscriptionStatus(org.subscription_status);
  const isIndividualAccount = tier === 'individual';
  const canAccessTeamFeatures = canUseTeamFeatures(tier);
  const normalizedRole = (role || '').toLowerCase();
  const isOwnerRole = normalizedRole === 'owner';
  const canViewImportExport = normalizedRole === 'owner' || normalizedRole === 'admin';
  const canAccessDispatchSettings = canUseDispatchEngine(tier);
  const canAccessStripeSettings = canUseOnlineInvoicePayments(tier);
  const canAccessXeroSettings = canUseAccountingIntegrations(tier);
  const canManageIntegrations = canAccessStripeSettings && (normalizedRole === 'owner' || normalizedRole === 'admin');
  const canManageSubscription = isOwnerRole;

  if (section === 'team-settings' && !canAccessTeamFeatures) {
    redirect(`/${locale}/dashboard/settings/account-settings`);
  }

  if (section === 'dispatch-settings' && !canAccessDispatchSettings) {
    redirect(`/${locale}/dashboard/settings/account-settings`);
  }

  if (section === 'import-export' && !canViewImportExport) {
    redirect(`/${locale}/dashboard/settings/account-settings`);
  }

  if (section === 'integrations' && !canManageIntegrations) {
    redirect(`/${locale}/dashboard/settings/account-settings`);
  }

  if (section === 'manage-subscription' && !canManageSubscription) {
    redirect(`/${locale}/dashboard/settings/account-settings`);
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
  let trucks: Array<{ id: string; name: string; plate_number: string | null; is_active: boolean | null; status: string | null }> = [];
  const initialRolePermissions = canAccessTeamFeatures ? await getOrganizationRolePermissions(org.id) : null;

  if (section === 'operations-settings') {
    const [{ data: serviceRows }, { data: truckRows }] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, description, base_price, is_recurring_default, recurrence_interval_days, auto_charge_default')
        .eq('organization_id', org.id)
        .order('name', { ascending: true }),
      supabase
        .from('trucks')
        .select('id, name, plate_number, is_active, status')
        .eq('organization_id', org.id)
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
    <div className="space-y-6 min-w-0">
            {section === 'account-settings' && (
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
                    showOwnerFields={isOwnerRole || normalizedRole === 'admin'}
                  />
                </div>
              </>
            )}

            {section === 'operations-settings' && (
              <OperationsSettingsTabs
                services={services}
                trucks={trucks}
                locale={locale}
                isIndividualAccount={isIndividualAccount}
                initialTab={initialTab}
              />
            )}

            {section === 'document-settings' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <InvoiceTaxSettingsPanel
                    initialTaxRatePercent={org.invoice_tax_rate_percent ?? 8.25}
                    initialCurrencyCode={org.invoice_currency_code || 'USD'}
                    locale={locale}
                  />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <LaborMarkupSettingsPanel
                    initialLaborRate={org.default_labor_rate ?? 95}
                    initialLaborCost={org.default_labor_cost ?? 45}
                    initialMaterialsMarkup={org.default_materials_markup ?? 30}
                    initialNightLaborRate={org.default_night_labor_rate ?? 135}
                    initialNightLaborCost={org.default_night_labor_cost ?? 65}
                    initialHolidayEmergencyLaborRate={org.default_holiday_emergency_labor_rate ?? 165}
                    initialHolidayEmergencyLaborCost={org.default_holiday_emergency_labor_cost ?? 75}
                    locale={locale}
                  />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <DocumentBrandingSettingsPanel
                    initialNextEstimateNumber={org.next_estimate_number ?? 1001}
                    initialNextInvoiceNumber={org.next_invoice_number ?? 1001}
                    initialHeaderColor={org.document_email_header_color || '#009966'}
                    initialDefaultPaymentTerms={org.default_payment_terms || 'Due on Receipt'}
                    locale={locale}
                  />
                </div>
              </>
            )}

            {section === 'team-settings' && canAccessTeamFeatures && (
              <TeamsPanel
                organizationId={org.id}
                locale={locale}
                subscriptionStatus={org.subscription_status || null}
                currentUserRole={normalizedRole || null}
                initialRolePermissions={initialRolePermissions || undefined}
                initialTab={initialTab}
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

            {section === 'dispatch-settings' && canAccessDispatchSettings && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <DispatchSettingsPanel
                  initialMaxJobsPerTruck={org.max_jobs_per_truck ?? 4}
                  initialAutoOptimizeDriveRoutes={org.auto_optimize_drive_routes ?? true}
                  locale={locale}
                />
              </div>
            )}

            {section === 'import-export' && canViewImportExport && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <ImportExportPanel locale={locale} />
              </div>
            )}

            {section === 'manage-subscription' && canManageSubscription && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <ReferralProgramCard
                    referralCode={org.referral_code}
                    referralDiscountActive={Boolean(org.referral_discount_active)}
                    referralDiscountEndsAt={org.referral_discount_ends_at}
                    locale={locale}
                  />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                  <SubscriptionCancellationCard currentSubscriptionStatus={org.subscription_status} locale={locale} />
                </div>

                <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
                  <div className="p-6 md:p-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-1">{translations.dashboard.deleteAccountTitle}</h3>
                      <p className="text-xs text-slate-400">{translations.dashboard.deleteAccountDescription}</p>
                    </div>

                    <DeleteAccountSurveyCard
                      locale={locale}
                      actionPath={`/${locale}/auth/delete-account`}
                      buttonLabel={translations.dashboard.deleteAccountButton}
                    />
                  </div>
                </div>
              </>
            )}
    </div>
  );
}
