'use client';

import { useParams, useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';
import { getTranslations } from '@/lib/translations';

export default function PricingPage() {
  const router = useRouter();
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';
  const translations = getTranslations(locale);

  const handlePlanSelection = (planType: 'individual' | 'growth' | 'enterprise') => {
    // Intercepts anonymous checkout and forces registration step while preserving tier intent
    router.push(`/signup?plan=${planType}`);
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
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
          
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
            <button onClick={() => handlePlanSelection('individual')} className="w-full text-center text-xs font-bold bg-slate-900 hover:bg-slate-850 text-slate-100 py-3 rounded-xl transition border border-slate-800 cursor-pointer">
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
              </ul>
            </div>
            <button onClick={() => handlePlanSelection('growth')} className="w-full text-center text-xs font-bold bg-white hover:bg-slate-100 text-slate-950 py-3 rounded-xl transition shadow-lg shadow-emerald-500/5 cursor-pointer">
              {translations.pricing.buyGrowth}
            </button>
          </div>

          {/* Enterprise Card */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6 flex flex-col justify-between min-h-[380px] relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
              Coming soon
            </span>
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
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature10}</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature7}</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature8}</li>
                <li className="flex items-center gap-2 text-slate-300"><span className="text-emerald-400 font-bold">✓</span> {translations.pricing.feature9}</li>
              </ul>
            </div>
            <button disabled className="w-full text-center text-xs font-bold bg-slate-800 text-slate-500 py-3 rounded-xl transition border border-slate-700 cursor-not-allowed opacity-70">
              {translations.pricing.buyEnterprise}
            </button>
          </div>

        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}