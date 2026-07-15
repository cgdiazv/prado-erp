import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import PasswordForm from './PasswordForm';
import ServicesPanel from './ServicesPanel';
import TrucksPanel from './TrucksPanel';
import ExpenseCategoriesPanel from './ExpenseCategoriesPanel';
import TeamsPanel from './TeamsPanel';
import SubscriptionCancellationCard from './SubscriptionCancellationCard';
import WorkspaceIdentityForm from './WorkspaceIdentityForm';
import XeroConnectionCard from './XeroConnectionCard';
import { getTranslations } from '@/lib/translations';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const translations = getTranslations(locale);

  const supabase = await createClient();

  // 1. Authenticate user session securely
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Fetch specific tenant workspace profile metadata safely (UPDATED: selected subscription_status)
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (!org) {
    redirect('/signup');
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

  const { data: services } = await supabase
    .from('services')
    .select('id, name, description, base_price')
    .eq('organization_id', org.id)
    .not('name', 'like', `${ARCHIVED_SERVICE_PREFIX}%`)
    .order('name', { ascending: true });

  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, name, plate_number, is_active, status')
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  const initial = org.name ? org.name.charAt(0) : "C";
  const isIndividualAccount = org.subscription_status === 'individual';
  const canAccessXeroSettings = org.subscription_status === 'trial' || org.subscription_status === 'enterprise';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />

      <div className="flex flex-1 relative">
        {/* UPDATED: Passing subscription_status to keep the sidebar contextually accurate */}
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />

        {/* Settings Form Configuration Viewport - Aligned Left */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 space-y-8 text-left">
            
            {/* Section Header Navigation Bridge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.accountWorkspaceSettings}</h1>
                <p className="text-xs text-slate-500 font-medium">{translations.dashboard.accountWorkspaceSettingsDescription}</p>
              </div>
              
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-gray-200 transition shadow-sm self-start sm:self-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                {translations.dashboard.backToDashboard}
              </Link>
            </div>

            {/* Module Section 1: Business Profile Information */}
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
              />
            </div>

            {/* NEW MODULE SECTION: Change Credentials Security Fields */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <PasswordForm locale={locale} />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <ServicesPanel initialServices={services || []} locale={locale} />
            </div>

            {!isIndividualAccount && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <TrucksPanel initialTrucks={trucks || []} locale={locale} />
              </div>
            )}

            {!isIndividualAccount && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <ExpenseCategoriesPanel locale={locale} />
              </div>
            )}

            {!isIndividualAccount && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <TeamsPanel organizationId={org.id} locale={locale} />
              </div>
            )}

            {canAccessXeroSettings && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <XeroConnectionCard organizationId={org.id} />
              </div>
            )}

            {!isIndividualAccount && (
              /* Module Section 2: Fleet & Routing Optimization Automation Rules */
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.dispatchSettings}</h3>
                    <p className="text-xs text-slate-400">{translations.dashboard.dispatchSettingsDescription}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input 
                        id="optimize-paths" 
                        type="checkbox" 
                        defaultChecked 
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <label htmlFor="optimize-paths" className="text-sm font-semibold text-slate-800 block">{translations.dashboard.autoOptimizeDriveRoutes}</label>
                        <span className="text-xs text-slate-400">{translations.dashboard.autoOptimizeDescription}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <SubscriptionCancellationCard currentSubscriptionStatus={org.subscription_status} locale={locale} />
            </div>

            {/* Module Section 3: Secure Signout Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-6 md:p-8 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.sessionSecurity}</h3>
                  <p className="text-xs text-slate-400">{translations.dashboard.sessionSecurityDescription}</p>
                </div>
                
                <form action="/auth/signout" method="POST">
                  <button 
                    type="submit" 
                    className="text-xs font-semibold px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition"
                  >
                    {translations.dashboard.signOutOfAccount}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}