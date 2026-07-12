import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function MarketingHomePage() {
  const supabase = await createClient();

  // 1. If already authenticated, fetch organization context to auto-route them in
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (org) {
      redirect('/dashboard');
    } else {
      redirect('/signup');
    }
  }

  // 2. Render the public Supabase-style Marketing Front Page
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation Navbar */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {/* Sleek Geometric Negative-Space Leaf Logo */}
            <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-4 h-4 text-white"
              >
              <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.47.16.05.33.03.46-.07.13-.1.2-.26.2-.43V17.5c0-1.93 1.57-3.5 3.5-3.5h1c1.93 0 3.5-1.57 3.5-3.5V6.7c0-.5-.32-.93-.8-1.07C15.11 5.2 13.6 5 12 5V2zm1 8.5c0-.83-.67-1.5-1.5-1.5S10 9.67 10 10.5v2.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-2.5z" fillRule="evenodd" clipRule="evenodd" className="hidden" />
              {/* Clean Modern Leaf Silhouette */}
              <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
              </svg>
            </span>
            Prado
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition">
              Sign In
            </Link>
            <Link href="/login?tab=signup" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition shadow-lg shadow-emerald-600/20">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Presentation Section */}
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-20 pb-16 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium mb-6 backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Next-Gen Field Service Management
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-2xl">
          Automate your jobs. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            Scale your workflow.
          </span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-slate-400 max-w-xl font-medium leading-relaxed">
          Prado combines secure tenant multi-occupancy billing, predictive path dispatch optimization, and automated invoicing in one central operational hub.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/signup" className="w-full sm:w-auto text-sm font-bold bg-white hover:bg-slate-100 text-slate-950 px-6 py-3 rounded-xl transition shadow-xl">
            Create Workspace Account
          </Link>
          <Link href="/login" className="w-full sm:w-auto text-sm font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 px-6 py-3 rounded-xl transition border border-slate-800">
            Explore Live Demo
          </Link>
        </div>

        {/* Minimalist Dashboard Preview Wireframe */}
        <div className="mt-20 w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-2 shadow-2xl shadow-emerald-500/5 backdrop-blur-xs max-w-5xl">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950 overflow-hidden aspect-[16/9] flex flex-col text-left text-xs text-slate-500">
            <div className="border-b border-slate-900 p-3 flex items-center gap-2 bg-slate-900/20">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
              </div>
              <div className="h-4 w-32 bg-slate-900 rounded mx-auto"></div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4 flex-1">
              <div className="border border-slate-900 rounded-lg p-3 space-y-2 bg-slate-900/10">
                <div className="h-3 w-16 bg-slate-900 rounded"></div>
                <div className="h-6 w-24 bg-slate-900/60 rounded"></div>
              </div>
              <div className="border border-slate-900 rounded-lg p-3 space-y-2 bg-slate-900/10">
                <div className="h-3 w-16 bg-slate-900 rounded"></div>
                <div className="h-6 w-24 bg-slate-900/60 rounded"></div>
              </div>
              <div className="border border-slate-900 rounded-lg p-3 space-y-2 bg-slate-900/10">
                <div className="h-3 w-16 bg-slate-900 rounded"></div>
                <div className="h-6 w-24 bg-slate-900/60 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 mt-auto">
        &copy; {new Date().getFullYear()} Prado Systems Inc. All rights reserved.
      </footer>
    </div>
  );
}