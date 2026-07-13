import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';
import { getTranslations } from '@/lib/translations';

export default async function TermsAndConditionsPage({
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
            {translations.terms.title}
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            {translations.terms.updated}
          </p>
        </header>

        <article className="space-y-6 text-sm text-slate-400 leading-relaxed font-medium">
          <p>
            {translations.terms.intro}
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.terms.section1Title}</h2>
            <p>
              {translations.terms.section1Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.terms.section2Title}</h2>
            <p>
              {translations.terms.section2Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.terms.section3Title}</h2>
            <p>
              {translations.terms.section3Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">{translations.terms.section4Title}</h2>
            <p>
              {translations.terms.section4Body}
            </p>
          </section>
        </article>
      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer locale={locale} />
    </div>
  );
}