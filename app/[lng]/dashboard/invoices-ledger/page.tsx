import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { checkTrialExpiry } from '@/lib/trialCheck';
import { getTranslations } from '@/lib/translations';
import InvoicesLedgerTable from '@/components/dashboard/InvoicesLedgerTable';
import { getUserOrganization } from '@/lib/organization';

interface InvoiceRow {
  id: string;
  customer_id: string;
  due_date: string;
  tax_amount: number;
  total_amount: number;
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

  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);
  if (trial.isExpired) {
    redirect('/dashboard/billing?expired=true');
  }

  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', org.id);

  const customerIds = customers?.map((customer) => customer.id) || [];

  const { data: invoices } = customerIds.length > 0
    ? await supabase
        .from('invoices')
      .select('id, customer_id, due_date, tax_amount, total_amount, status, stripe_payment_url, customers(first_name, last_name, company_name)')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false })
    : { data: [] as InvoiceRow[] };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {translations.dashboard.invoicesAndLedger}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {isEs
                  ? 'Monitorea el estado de pago de todas las facturas emitidas en tu workspace.'
                  : 'Monitor payment status for all invoices issued in your workspace.'}
              </p>
            </div>

            <InvoicesLedgerTable invoices={(invoices as InvoiceRow[]) ?? []} locale={locale} />
          </div>
    </main>
  );
}
