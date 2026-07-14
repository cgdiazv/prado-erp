'use client';

import { useParams } from 'next/navigation';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';
import SupportTicketForm from '@/components/SupportTicketForm';
import { getTranslations } from '@/lib/translations';

export default function SupportHubPage() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';
  const translations = getTranslations(locale);

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
        <div className="lg:col-span-2">
          <SupportTicketForm locale={locale} theme="dark" />
        </div>

      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer locale={locale} />
    </div>
  );
}