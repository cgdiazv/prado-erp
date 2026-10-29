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
    <div className="min-h-screen bg-white text-[#101828] flex flex-col selection:bg-[#0a9d73] selection:text-white font-sans">
      {/* Navigation Header */}
      <PublicNavbar theme="light" locale={locale} />

      {/* Main Container Grid Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 text-left items-start">
        {/* Left Side Info Blocks */}
        <div className="lg:col-span-1 space-y-6">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs" />
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                {translations.support.badge}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#101828] tracking-tight">
              {translations.support.title}
            </h1>
            <p className="text-sm text-[#667085] leading-relaxed">
              {translations.support.description}
            </p>
          </header>

          <div className="border border-[#eaecf0] bg-[#fcfcfd] p-5 rounded-2xl space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              {translations.support.inboxTitle}
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              {translations.support.inboxBody}
            </p>
            <a
              href="mailto:support@pradojob.com"
              className="inline-block text-xs font-semibold text-[#0a9d73] hover:text-[#088763] transition underline decoration-[#0a9d73]/30"
            >
              support@pradojob.com
            </a>
          </div>
        </div>

        {/* Right Side Interactive Ticketing Section Form Container */}
        <div className="lg:col-span-2">
          <SupportTicketForm locale={locale} theme="light" />
        </div>
      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer locale={locale} />
    </div>
  );
}