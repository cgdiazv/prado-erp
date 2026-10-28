import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';
import InvoicesLedgerTable from '@/components/dashboard/InvoicesLedgerTable';
import CreateInvoiceModal from '@/components/dashboard/CreateInvoiceModal';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { getUserOrganization } from '@/lib/organization';

const ARCHIVED_SERVICE_PREFIX = '[[ARCHIVED]] ';

interface InvoiceRow {
  id: string;
  customer_id: string;
  invoice_number?: number | null;
  due_date: string;
  tax_amount: number;
  total_amount: number;
  currency_code?: string | null;
  status: 'paid' | 'unpaid';
  stripe_payment_url?: string | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null;
}

export default async function InvoicesLedgerPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { organization: org, role } = await getUserOrganization(user.id);

  if (!org) redirect(`/${locale}/auth/access-pending`);

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

  const customerIds = customers?.map((customer) => customer.id) || [];

  const { data: invoices } = customerIds.length > 0
    ? await supabase
        .from('invoices')
        .select('*, customers(first_name, last_name, company_name, email)')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false })
    : { data: [] as InvoiceRow[] };

  return (
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-6 md:px-10 pt-10 pb-8 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {translations.dashboard.invoicesAndLedger}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {isEs
                    ? 'Monitorea el estado de pago de todas las facturas emitidas en tu workspace.'
                    : 'Monitor payment status for all invoices issued in your workspace.'}
                </p>
              </div>
              <CreateInvoiceModal
                customers={customers || []}
                services={services || []}
                orgTaxRatePercent={Number(org.invoice_tax_rate_percent ?? 0)}
                currencyCode={org.invoice_currency_code}
                locale={locale}
              />
            </div>

            <InvoicesLedgerTable
              invoices={(invoices as InvoiceRow[]) ?? []}
              locale={locale}
              orgTaxRatePercent={Number(org.invoice_tax_rate_percent ?? 0)}
            />
          </div>
    </main>
  );
}
