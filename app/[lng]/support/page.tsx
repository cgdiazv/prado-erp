'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';
import { submitSupportTicket } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

export default function SupportHubPage() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';
  const translations = getTranslations(locale);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Shared Navigation Header Component with Global Mobile Drawer Context */}
      <PublicNavbar theme="dark" locale={locale} />

      {/* Main Container Grid Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 text-left items-start">
        
        {/* Left Side Info Blocks */}
        <div className="lg:col-span-1 space-y-6">
          <header className="space-y-3">
            <span className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium backdrop-blur-xs">
              {translations.support.badge}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {translations.support.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">
              {translations.support.description}
            </p>
          </header>

          <div className="border border-slate-900 bg-slate-900/10 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{translations.support.inboxTitle}</h3>
            <p className="text-xs text-slate-400 font-medium">
              {translations.support.inboxBody}
            </p>
            <a 
              href="mailto:support@pradojob.com" 
              className="block text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition underline decoration-emerald-500/30"
            >
              support@pradojob.com
            </a>
          </div>
        </div>

        {/* Right Side Interactive Ticketing Section Form Container */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white tracking-tight mb-1">{translations.support.formTitle}</h2>
          <p className="text-xs text-slate-400 mb-6 font-medium">{translations.support.formDescription}</p>

          {formStatus === 'success' ? (
            <div className="p-6 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl font-semibold text-center leading-relaxed">
              {translations.support.successMessage}
            </div>
          ) : (
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setFormStatus('loading');
                setErrorMessage('');
                
                const data = new FormData(e.currentTarget);
                const result = await submitSupportTicket(data);
                
                if (result?.error) {
                  setErrorMessage(result.error);
                  setFormStatus('error');
                } else {
                  setFormStatus('success');
                }
              }} 
              className="space-y-4"
            >
              {formStatus === 'error' && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-400 text-xs rounded-lg font-medium">
                  ✕ {errorMessage || translations.support.errorFallback}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.support.nameLabel}</label>
                  <input 
                    type="text" 
                    name="name"
                    required 
                    placeholder="Jane Doe" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.support.emailLabel}</label>
                  <input 
                    type="email" 
                    name="email"
                    required 
                    placeholder="jane@organization.com" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.support.urgencyLabel}</label>
                <select 
                  name="urgency"
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium cursor-pointer"
                >
                  <option value="low">{translations.support.urgencyLow}</option>
                  <option value="medium">{translations.support.urgencyMedium}</option>
                  <option value="high">{translations.support.urgencyHigh}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">{translations.support.messageLabel}</label>
                <textarea 
                  name="message"
                  required 
                  rows={5}
                  placeholder={translations.support.messagePlaceholder} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium resize-none leading-relaxed" 
                />
              </div>

              <button 
                type="submit" 
                disabled={formStatus === 'loading'} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-xl mt-2 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {formStatus === 'loading' ? translations.support.loadingButton : translations.support.submitButton}
              </button>
            </form>
          )}
        </div>

      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer locale={locale} />
    </div>
  );
}