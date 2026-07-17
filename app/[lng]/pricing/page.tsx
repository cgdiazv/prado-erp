'use client';

import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';
import { getTranslations } from '@/lib/translations';

export default function PricingPage() {
  const router = useRouter();
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';
  const translations = getTranslations(locale);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSuccess, setLeadSuccess] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const handlePlanSelection = (planType: 'individual' | 'growth' | 'enterprise') => {
    // Intercepts anonymous checkout and forces registration step while preserving tier intent
    router.push(`/signup?plan=${planType}`);
  };

  const handleManualLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLeadError(null);
    setLeadSuccess(null);
    setIsSubmittingLead(true);

    try {
      const response = await fetch('/api/lead-magnet/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          company: leadCompany,
          locale,
          source: 'pricing-page-banner',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setLeadError(result.error || translations.pricing.manualGenericError);
        return;
      }

      setLeadSuccess(translations.pricing.manualSuccess);
      setLeadName('');
      setLeadEmail('');
      setLeadCompany('');
    } catch {
      setLeadError(translations.pricing.manualGenericError);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      <PublicNavbar locale={locale} />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 space-y-12">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium backdrop-blur-xs">
            {translations.pricing.badge}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {translations.pricing.titleLine1} <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">{translations.pricing.titleLine2}</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            {translations.pricing.description}
          </p>
        </header>

        {/* Pricing Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto mb-12 md:mb-16">
          
          {/* Individual Card */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6 flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{translations.pricing.coreTier}</span>
                <h3 className="text-xl font-bold text-white mt-1">{translations.pricing.individualOperator}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {translations.pricing.coreDescription}
              </p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-white font-mono">$29</span>
                <span className="text-slate-500 text-xs font-semibold ml-2">{translations.pricing.monthly}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2 text-slate-400"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature1}</li>
                <li className="flex items-center gap-2 text-slate-400"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature2}</li>
                <li className="flex items-center gap-2 text-slate-400"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature3}</li>
              </ul>
            </div>
            <button onClick={() => handlePlanSelection('individual')} className="w-full text-center text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 py-3 rounded-xl transition border border-slate-700 cursor-pointer">
              {translations.pricing.buyIndividual}
            </button>
          </div>

          {/* Growth Card */}
          <div className="bg-slate-900/60 border-2 border-emerald-500/50 p-6 md:p-8 rounded-2xl space-y-6 flex flex-col justify-between min-h-[380px] relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
              {translations.pricing.mostPopular}
            </span>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">{translations.pricing.scaleTier}</span>
                <h3 className="text-xl font-bold text-white mt-1">{translations.pricing.growthOperations}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {translations.pricing.growthDescription}
              </p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-white font-mono">$59</span>
                <span className="text-slate-500 text-xs font-semibold ml-2">{translations.pricing.monthly}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature4}</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature5}</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature6}</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature7}</li>
              </ul>
            </div>
            <button onClick={() => handlePlanSelection('growth')} className="w-full text-center text-xs font-bold bg-white hover:bg-slate-100 text-slate-950 py-3 rounded-xl transition shadow-lg shadow-emerald-500/5 cursor-pointer">
              {translations.pricing.buyGrowth}
            </button>
          </div>

          {/* Enterprise Card */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6 flex flex-col justify-between min-h-[380px] relative">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{translations.pricing.enterpriseTier}</span>
                <h3 className="text-xl font-bold text-white mt-1">{translations.pricing.enterpriseOperations}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {translations.pricing.enterpriseDescription}
              </p>
              <div className="pt-2">
                <span className="text-4xl font-extrabold text-white font-mono">$99</span>
                <span className="text-slate-500 text-xs font-semibold ml-2">{translations.pricing.monthly}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800/60">
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> Unlimited Linked User Roles</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> QuickBooks &amp; Xero Integration</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature8}</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature9}</li>
              </ul>
            </div>
            <button onClick={() => handlePlanSelection('enterprise')} className="w-full text-center text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 py-3 rounded-xl transition border border-slate-700 cursor-pointer">
              {translations.pricing.buyEnterprise}
            </button>
          </div>

        </section>

        <section className="mt-8 md:mt-12 relative overflow-hidden rounded-3xl border border-emerald-700/50 bg-gradient-to-br from-emerald-900/30 via-slate-900 to-teal-900/20 p-6 md:p-8">
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" aria-hidden="true" />

          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-3 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                {translations.pricing.manualBadge}
              </p>
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight max-w-xl">
                {translations.pricing.manualHeadline}
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {translations.pricing.manualDescription}
              </p>
            </div>

            <form onSubmit={handleManualLead} className="lg:col-span-2 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 md:p-5 space-y-3 backdrop-blur-sm">
              <label className="text-xs font-semibold text-slate-300 block" htmlFor="lead-name">
                {translations.pricing.manualNameLabel}
              </label>
              <input
                id="lead-name"
                type="text"
                required
                value={leadName}
                onChange={(event) => setLeadName(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder={translations.pricing.manualNamePlaceholder}
              />

              <label className="text-xs font-semibold text-slate-300 block" htmlFor="lead-email">
                {translations.pricing.manualEmailLabel}
              </label>
              <input
                id="lead-email"
                type="email"
                required
                value={leadEmail}
                onChange={(event) => setLeadEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder={translations.pricing.manualEmailPlaceholder}
              />

              <label className="text-xs font-semibold text-slate-300 block" htmlFor="lead-company">
                {translations.pricing.manualCompanyLabel}
              </label>
              <input
                id="lead-company"
                type="text"
                required
                value={leadCompany}
                onChange={(event) => setLeadCompany(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder={translations.pricing.manualCompanyPlaceholder}
              />

              {leadError && <p className="text-xs text-rose-400">{leadError}</p>}
              {leadSuccess && <p className="text-xs text-emerald-300">{leadSuccess}</p>}

              <button
                type="submit"
                disabled={isSubmittingLead}
                className="w-full rounded-xl bg-emerald-400 text-slate-950 font-bold text-sm py-2.5 hover:bg-emerald-300 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmittingLead ? translations.pricing.manualLoading : translations.pricing.manualSubmit}
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}