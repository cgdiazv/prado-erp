'use client';

import { useState, FormEvent } from 'react';
import Footer from '@/components/Footer';

export default function LiveDemoPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');

    setTimeout(() => {
      setStatus('success');
    }, 1200);
  }

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
            <a href="/pricing" className="text-sm font-medium text-slate-400 hover:text-white transition">Pricing</a>
            <a href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition">Sign In</a>
            <a href="/signup" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition">Start Free Trial</a>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-12">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium backdrop-blur-xs">
            Live Product Walkthrough
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            See Prado in Action. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">Tailored Environment Demos.</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            Curious how our predictive path dispatch engine or multi-tenant ledger architecture adapts to your operations? Book a 1-on-1 walkthrough configured around your exact team workflow metrics.
          </p>
        </header>

        {/* Scheduler Form with Added Phone Field */}
        <section className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 md:p-10 shadow-xl">
          {status === 'success' ? (
            <div className="p-6 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl font-semibold text-center leading-relaxed">
              ✓ Demo slot reserved! Check your email inbox. One of our system engineers will reach out to supply a secure video conferencing portal invitation.
            </div>
          ) : (
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Jane Doe" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Business Email</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="jane@example.com" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Company Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Acme Global Industries" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div className="md:col-span-1">
                  {/* NEW PHONE NUMBER INPUT FIELD */}
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Phone Number</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="(555) 000-0000" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Target Date Preference</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium scheme-dark" 
                  />
                </div>
              </div>

              <button type="submit" disabled={status === 'loading'} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-xl mt-4">
                {status === 'loading' ? 'Securing Calendar Hold...' : 'Request Free Live Demo'}
              </button>
            </form>
          )}
        </section>
      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer />
    </div>
  );
}