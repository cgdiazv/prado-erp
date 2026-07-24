import Footer from '@/components/Footer';
import CookieSettingsButton from '@/components/CookieSettingsButton';
import PublicNavbar from '@/components/PublicNavbar';
import { getTranslations } from '@/lib/translations';

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const translations = getTranslations(locale);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Universal Shared Navigation Header Layout */}
      <PublicNavbar theme="dark" locale={locale} />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-8 text-left">
        <header className="space-y-4 border-b border-slate-900 pb-6">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {translations.privacy.title}
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            {translations.privacy.updated}
          </p>
        </header>

        <article className="space-y-6 text-sm text-slate-400 leading-relaxed font-medium">
          <p>
            {translations.privacy.intro}
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.privacy.section1Title}</h2>
            <p>
              {translations.privacy.section1Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.privacy.section2Title}</h2>
            <p>
              {translations.privacy.section2Body}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>{translations.privacy.section2Item1}</li>
              <li>{translations.privacy.section2Item2}</li>
              <li>{translations.privacy.section2Item3}</li>
              <li>{translations.privacy.section2Item4}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.privacy.section3Title}</h2>
            <p>
              {translations.privacy.section3Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.privacy.section4Title}</h2>
            <p>
              {translations.privacy.section4Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.privacy.section5Title}</h2>
            <p>
              {translations.privacy.section5Body}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>{translations.privacy.section5Item1}</li>
              <li>{translations.privacy.section5Item2}</li>
              <li>{translations.privacy.section5Item3}</li>
              <li>{translations.privacy.section5Item4}</li>
            </ul>
            <div className="pt-2">
              <CookieSettingsButton locale={locale} />
            </div>
          </section>
        </article>
      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer locale={locale} />
    </div>
  );
}