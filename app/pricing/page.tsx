'use client';

import Footer from '@/components/Footer';

export default function PricingPage() {
  const handleStripeCheckout = (planType: 'individual' | 'enterprise') => {
    if (planType === 'individual') {
      // Opens first tier payment portal in a new tab securely
      window.open('https://pay.indevasa.com/b/00wdR85i76E4dXg2Yl4Ni04', '_blank', 'noopener,noreferrer');
    } else {
      // Opens second tier payment portal in a new tab securely
      window.open('https://pay.indevasa.com/b/eVq4gy5i73rS5qKdCZ4Ni05', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Navigation */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
              </svg>
            </span>
            Prado
          </a>
          <div className="flex items-center gap-4">
            <a href="/demo" className="text-sm font-medium text-slate-400 hover:text-white transition">Book Demo</a>
            <a href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition">Sign In</a>
            <a href="/signup" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition">Start Free Trial</a>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 space-y-12">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium backdrop-blur-xs">
            Simple Monthly Tiers
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Plans built to grow <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">with your fleet.</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            No long-term commitments. Select a configuration package below to instantly secure and launch your workspace.
          </p>
        </header>

        {/* Pricing Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
          
          {/* Individual Card */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6 flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Core Tier</span>
                <h3 className="text-xl font-bold text-white mt-1">Individual Operator</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Best for single-person workspaces driving fundamental CRM records, manual route coordination matrices, and basic invoice runs.
              </p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-white font-mono">$29</span>
                <span className="text-slate-500 text-xs font-semibold ml-2">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2 text-slate-400"><span className="text-emerald-400 font-bold">✓</span> 1 System User Profile</li>
                <li className="flex items-center gap-2 text-slate-400"><span className="text-emerald-400 font-bold">✓</span> Basic Customer Ledger</li>
                <li className="flex items-center gap-2 text-slate-400"><span className="text-emerald-400 font-bold">✓</span> Invoicing & Ledger Statements</li>
              </ul>
            </div>
            <button onClick={() => handleStripeCheckout('individual')} className="w-full text-center text-xs font-bold bg-slate-900 hover:bg-slate-850 text-slate-100 py-3 rounded-xl transition border border-slate-800 cursor-pointer">
              Buy Individual Plan
            </button>
          </div>

          {/* Enterprise Card */}
          <div className="bg-slate-900/60 border-2 border-emerald-500/50 p-6 md:p-8 rounded-2xl space-y-6 flex flex-col justify-between min-h-[380px] relative">
            <span className="absolute -top-3 right-6 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
              Most Popular
            </span>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Scale Tier</span>
                <h3 className="text-xl font-bold text-white mt-1">Enterprise Operations</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Optimized for expanding teams utilizing advanced predictive path mapping algorithms, instant dispatch routing, and live multi-tenant expense monitoring.
              </p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-white font-mono">$99</span>
                <span className="text-slate-500 text-xs font-semibold ml-2">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> Up to 5 Linked User Roles</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> Predictive Path Dispatch Engine</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> Real-Time Multi-Tenant Expense Auditing</li>
              </ul>
            </div>
            <button onClick={() => handleStripeCheckout('enterprise')} className="w-full text-center text-xs font-bold bg-white hover:bg-slate-100 text-slate-950 py-3 rounded-xl transition shadow-lg shadow-emerald-500/5 cursor-pointer">
              Buy Enterprise Plan
            </button>
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}