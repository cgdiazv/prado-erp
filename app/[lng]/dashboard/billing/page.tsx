import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

interface BillingPageProps {
  searchParams: Promise<{ expired?: string }>;
}

export default async function DashboardBillingPage({ searchParams }: BillingPageProps) {
  const { expired } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 space-y-6 text-center shadow-xl">
        
        <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-white">
            {expired ? 'Your 14-day trial has concluded' : 'Manage Subscription'}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            To unlock your fleet dispatch routes, database logs, and accounting metrics, choose an operating plan to continue.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {/* Send them to the same Stripe Links you set up on your pricing page */}
          <a 
            href="https://buy.stripe.com/your_individual_plan_link"
            className="block w-full bg-slate-900 hover:bg-slate-850 text-slate-100 border border-slate-800 text-xs font-bold py-3 rounded-xl transition"
          >
            Activate Individual Plan — $29/mo
          </a>
          <a 
            href="https://buy.stripe.com/your_enterprise_plan_link"
            className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-600/10"
          >
            Activate Enterprise Operations — $99/mo
          </a>
        </div>
      </div>
    </div>
  );
}