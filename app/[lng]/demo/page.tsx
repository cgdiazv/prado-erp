'use client';

import { useParams } from 'next/navigation';
import { useState, FormEvent } from 'react';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';
import { getTranslations } from '@/lib/translations';

export default function LiveDemoPage() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';
  const translations = getTranslations(locale);
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
      
      <PublicNavbar locale={locale} />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-12">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium backdrop-blur-xs">
            {translations.demo.badge}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {translations.demo.titleLine1} <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">{translations.demo.titleLine2}</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            {translations.demo.description}
          </p>
        </header>

        {/* Scheduler Form with Added Phone Field */}
        <section className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 md:p-10 shadow-xl">
          {status === 'success' ? (
            <div className="p-6 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl font-semibold text-center leading-relaxed">
              {translations.demo.successMessage}
            </div>
          ) : (
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.demo.fullName}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Jane Doe" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.demo.businessEmail}</label>
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
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.demo.companyName}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Acme Global Industries" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div className="md:col-span-1">
                  {/* NEW PHONE NUMBER INPUT FIELD */}
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.demo.phoneNumber}</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="(555) 000-0000" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.demo.targetDatePreference}</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium scheme-dark" 
                  />
                </div>
              </div>

              <button type="submit" disabled={status === 'loading'} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-xl mt-4">
                {status === 'loading' ? translations.demo.loadingButton : translations.demo.submitButton}
              </button>
            </form>
          )}
        </section>
      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer locale={locale} />
    </div>
  );
}