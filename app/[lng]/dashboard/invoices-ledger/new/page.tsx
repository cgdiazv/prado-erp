import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { getUserOrganization } from '@/lib/organization';
import InvoiceEditor from '../InvoiceEditor';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ customerId?: string; from?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';

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

  const canAccessInvoice = await hasDashboardModuleAccess(org.id, role, 'invoice');
  if (!canAccessInvoice) {
    redirect(`/${locale}/dashboard`);
  }

  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect(`/${locale}/dashboard?expired=true`);
  }

  const [{ data: customers }, { data: services }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, email')
      .eq('organization_id', org.id)
      .order('first_name', { ascending: true }),
    supabase
      .from('services')
      .select('id, name, base_price')
      .eq('organization_id', org.id)
      .not('name', 'like', `${ARCHIVED_SERVICE_PREFIX}%`)
      .order('name', { ascending: true }),
  ]);

  return (
    <InvoiceEditor
      locale={locale}
      customers={customers || []}
      services={services || []}
      orgTaxRatePercent={Number(org.invoice_tax_rate_percent ?? 0)}
      orgCurrencyCode={org.invoice_currency_code || 'USD'}
      preselectedCustomerId={resolvedSearchParams.customerId}
      returnToCustomer={resolvedSearchParams.from === 'customer'}
    />
  );
}

