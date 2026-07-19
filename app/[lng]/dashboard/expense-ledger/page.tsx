import { redirect } from 'next/navigation';
import ExpenseLedger from '@/components/dashboard/ExpenseLedger';
import { getUserOrganization } from '@/lib/organization';
import { createClient } from '@/lib/supabaseServer';
import { getTranslations } from '@/lib/translations';

export const dynamic = 'force-dynamic';

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  jobs: {
    id: string;
    job_type: string;
    scheduled_date: string | null;
  } | null;
}

interface ExpenseLedgerPageProps {
  params: Promise<{ lng: string }>;
}

export default async function ExpenseLedgerPage({ params }: ExpenseLedgerPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams?.lng || 'en';
  const translations = getTranslations(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { organization: org } = await getUserOrganization(user.id);

  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const { data: expensesData, error } = await supabase
    .from('expenses')
    .select('id, expense_date, category, vendor, description, amount, jobs(id, job_type, scheduled_date)')
    .eq('organization_id', org.id)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch expenses:', error.message);
  }

  const expenses = (expensesData ?? []) as unknown as ExpenseRow[];

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-5xl ml-0 grid grid-cols-1 gap-4 sm:gap-6 md:gap-6 text-left">
        <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translations.dashboard.trackedExpensesSection}</h1>
          <p className="text-xs text-slate-400 mt-1">{translations.dashboard.expenseLedgerDescription}</p>
        </div>

        <ExpenseLedger expenses={expenses} locale={locale} />
      </div>
    </main>
  );
}