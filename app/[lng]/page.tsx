import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Footer from '@/components/Footer';
import Script from 'next/script';
import PublicNavbar from '@/components/PublicNavbar';
import ScreenshotCarousel from '@/components/ScreenshotCarousel';
import { getTranslations } from '@/lib/translations';

export default async function MarketingHomePage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const translations = getTranslations(lng);
  const supabase = await createClient();
  const industryCards = [
    {
      name: translations.home.industryLandscaping,
      image:
        'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1400&q=80',
    },
    {
      name: translations.home.industryConstruction,
      image:
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80',
    },
    {
      name: translations.home.industryCleaning,
      image:
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80',
    },
    {
      name: translations.home.industryCarpentry,
      image:
        'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1400&q=80',
    },
    {
      name: translations.home.industryRoofing,
      image:
        'https://cdn.pixabay.com/photo/2016/11/29/03/53/house-1867187_1280.jpg',
    },
    {
      name: translations.home.industryHvac,
      image:
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1400&q=80',
    },
  ];

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <PublicNavbar locale={lng} />

      {/* Hero Presentation Section */}
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-20 pb-16 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium mb-6 backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          {translations.home.badge}
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-2xl">
          {translations.home.heroTitleLine1} <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            {translations.home.heroTitleLine2}
          </span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-slate-400 max-w-xl font-medium leading-relaxed">
          {translations.home.heroDescription}
        </p>

        <div className="mt-10 mb-12 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/pricing" className="w-full sm:w-auto text-sm font-bold bg-white hover:bg-slate-100 text-slate-950 px-6 py-3 rounded-xl transition shadow-xl">
            {translations.home.viewPricing}
          </Link>
          <Link href="/demo" className="w-full sm:w-auto text-sm font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 px-6 py-3 rounded-xl transition border border-slate-800">
            {translations.home.exploreDemo}
          </Link>
        </div>

        <section className="bg-slate-950/40 py-24 px-6 relative overflow-hidden w-full">
          <div className="max-w-6xl mx-auto flex justify-center">
            <ScreenshotCarousel />
          </div>
        </section>

        {/*
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
        */}

        {/* Why Choose Prado Section */}
        <section className="border-t border-slate-900 bg-slate-950/50 py-24 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {translations.home.whyChooseTitle.split('Prado?')[0]}<span className="text-emerald-400">Prado?</span>
              </h2>
              <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
                {translations.home.whyChooseSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1: Routing */}
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:bg-slate-900/80 transition duration-300 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-emerald-950/50 border border-emerald-800 flex items-center justify-center mb-6 text-emerald-400 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">{translations.home.featureRoutingTitle}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                  {translations.home.featureRoutingDescription}
                </p>
              </div>

              {/* Feature 2: Financials */}
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:bg-slate-900/80 transition duration-300 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-teal-950/50 border border-teal-800 flex items-center justify-center mb-6 text-teal-400 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">{translations.home.featureFinancialsTitle}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                  {translations.home.featureFinancialsDescription}
                </p>
              </div>

              {/* Feature 3: CRM */}
              <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl hover:bg-slate-900/80 transition duration-300 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-blue-950/50 border border-blue-800 flex items-center justify-center mb-6 text-blue-400 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">{translations.home.featureCrmTitle}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                  {translations.home.featureCrmDescription}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Industries Section */}
        <section className="border-t border-slate-900 bg-slate-950/40 py-24 px-6 relative overflow-hidden w-full">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {translations.home.industriesTitlePrefix} <span className="text-emerald-400">Prado</span>
              </h2>
              <p className="mt-3 text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                {translations.home.industriesSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {industryCards.map((industry) => (
                <article
                  key={industry.name}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg shadow-slate-950/40"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={industry.image}
                      alt={industry.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
                  </div>
                  <div className="p-5 text-left">
                    <h3 className="text-lg font-bold text-white">{industry.name}</h3>
                    <p className="mt-2 text-xs text-slate-400">{translations.home.industryCardDescription}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* NEW: Final Call to Action Section */}
        <section className="border-t border-slate-900 bg-slate-950 py-20 px-6 text-center relative overflow-hidden">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {translations.home.ctaTitle}
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
              {translations.home.ctaDescription}
            </p>
            <div className="pt-4">
              <Link 
                href="/pricing" 
                className="inline-block text-sm font-bold bg-white hover:bg-slate-100 text-slate-950 px-8 py-3.5 rounded-xl transition shadow-xl hover:scale-[1.01] active:scale-[0.99]"
              >
                {translations.home.ctaButton}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Global Landing Page Footer Component */}
      <Footer locale={lng} />
      {/* 2. CHATBASE INTEGRATION EMBEDDABLE ENGINE */}
      <Script
        id="chatbase-integration"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.chatbaseConfig = { chatbotId: 'QBldWxwKvYFFN27nBni1s' };
            if (!document.getElementById('chatbase-script')) {
              const chatbaseScript = document.createElement('script');
              chatbaseScript.id = 'chatbase-script';
              chatbaseScript.src = 'https://www.chatbase.co/embed.min.js';
              chatbaseScript.defer = true;
              document.head.appendChild(chatbaseScript);
            }
          `,
        }}
      />
    </div>
  );
}
