import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import ExpenseLedger from '@/components/dashboard/ExpenseLedger';
import LogExpenseForm from '@/components/dashboard/LogExpenseForm';
import { checkTrialExpiry } from '@/lib/trialCheck'; // Import utility

export default async function LedgerPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, trial_starts_at, subscription_status')
    .eq('owner_id', user.id)
    .single();
  if (!org) redirect('/signup');

  // 1. SECURITY TIER GUARD: Allow 'enterprise' and active 'trial' profiles, block 'individual'
if (org.subscription_status === 'individual') {
  redirect('/dashboard?restricted=true');
}

  // Verify trial lifecycle
  const trial = checkTrialExpiry(org.trial_starts_at, org.subscription_status);

  if (trial.isExpired) {
    // Redirect them to a dedicated internal billing page to pay
    redirect('/dashboard/billing?expired=true');
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('organization_id', org.id)
    .order('expense_date', { ascending: false });

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} />
      <div className="flex flex-1 relative">
        {/* UPDATED: Passing the explicit subscription status down to the sidebar component */}
        <DashboardSidebar subscriptionStatus={org.subscription_status} />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          {/* Main Grid Wrapper */}
          <div className="max-w-5xl ml-0 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            
            {/* 1. Header Row - Spans full width across all 3 grid columns */}
            <div className="lg:col-span-3 flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Ledger</h1>
              <p className="text-xs text-slate-400 mt-1">Audit cash flow logs and corporate vendor expenses</p>
            </div>
            
            {/* 2. Middle Content Column - Renders flush below the border line */}
            <div className="lg:col-span-2">
              <ExpenseLedger expenses={expenses} />
            </div>
            
            {/* 3. Right Sidebar Form Column - Aligns to the exact same top level */}
            <div className="lg:col-span-1">
              <LogExpenseForm />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}