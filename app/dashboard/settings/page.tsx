import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import PasswordForm from '@/app/dashboard/settings/PasswordForm';
import ExpenseCategoriesPanel from '@/app/dashboard/settings/ExpenseCategoriesPanel';

export default async function SettingsPage() {
  const supabase = await createClient();

  // 1. Authenticate user session securely
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Fetch specific tenant workspace profile metadata safely (email column omitted)
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single();

  if (!org) {
    redirect('/signup');
  }

  const initial = org.name ? org.name.charAt(0) : "C";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <DashboardNavbar userInitials={initial} />

      <div className="flex flex-1 relative">
        {/* Reusable Operational Left Sidebar Panel */}
        <DashboardSidebar />

        {/* Settings Form Configuration Viewport - Aligned Left */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-4xl ml-0 space-y-8 text-left">
            
            {/* Section Header Navigation Bridge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account & Workspace Settings</h1>
                <p className="text-xs text-slate-500 font-medium">Manage your system integration channels and environment configs</p>
              </div>
              
              <Link 
                href="/dashboard" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-gray-200 transition shadow-sm self-start sm:self-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>

            {/* Main Configuration Card Module */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs divide-y divide-gray-100">
              
              {/* Module Section 1: Business Profile Information */}
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Workspace Identity</h3>
                  <p className="text-xs text-slate-400">Public profile configurations visible to linked client operations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company Name</label>
                    <input 
                      type="text" 
                      defaultValue={org.name || ""} 
                      disabled
                      className="w-full rounded-lg border border-gray-200 bg-slate-50 p-2.5 text-sm text-gray-500 cursor-not-allowed outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">System Account Email</label>
                    <input 
                      type="email" 
                      defaultValue={user.email || ""} 
                      disabled
                      className="w-full rounded-lg border border-gray-200 bg-slate-50 p-2.5 text-sm text-gray-500 cursor-not-allowed outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* NEW MODULE SECTION: Change Credentials Security Fields */}
              <PasswordForm />

              <ExpenseCategoriesPanel />

              {/* Module Section 2: Fleet & Routing Optimization Automation Rules */}
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Dispatch Settings</h3>
                  <p className="text-xs text-slate-400">Optimize rules driving predictive path dispatch routing algorithms</p>
                </div>

                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-start gap-3">
                    <input 
                      id="optimize-paths" 
                      type="checkbox" 
                      defaultChecked 
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <label htmlFor="optimize-paths" className="text-sm font-semibold text-slate-800 block">Auto-Optimize Drive Routes</label>
                      <span className="text-xs text-slate-400">Rearrange multi-stop jobs via Google Maps algorithms to minimize travel times</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module Section 3: Secure Signout Actions */}
              <div className="p-6 md:p-8 flex items-center justify-between max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Session Security</h3>
                  <p className="text-xs text-slate-400">Terminate cookie authorization tokens securely</p>
                </div>
                
                <form action="/auth/signout" method="POST">
                  <button 
                    type="submit" 
                    className="text-xs font-semibold px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition"
                  >
                    Sign Out of Account
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