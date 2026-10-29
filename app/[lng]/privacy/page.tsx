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
    <div className="min-h-screen bg-white text-[#101828] flex flex-col selection:bg-[#0a9d73] selection:text-white font-sans">
      {/* Navigation Header */}
      <PublicNavbar theme="light" locale={locale} />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 sm:px-8 py-16 sm:py-20 space-y-8 text-left">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#f0fdf9] border border-[#a7f3d0] rounded-full px-3.5 py-1 text-xs font-semibold text-[#0a9d73]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0a9d73] animate-pulse" />
            <span>Legal Notice</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#101828] tracking-tight">
            {translations.privacy.title}
          </h1>
          <p className="text-xs text-[#667085] font-medium">
            {translations.privacy.updated}
          </p>
        </header>

        <article className="bg-white border border-[#eaecf0] rounded-2xl p-6 sm:p-10 shadow-xs space-y-8 text-sm sm:text-base text-[#475467] leading-relaxed font-normal">
          <p>
            {translations.privacy.intro}
          </p>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">{translations.privacy.section1Title}</h2>
            <p>
              {translations.privacy.section1Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">{translations.privacy.section2Title}</h2>
            <p>
              {translations.privacy.section2Body}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#475467] marker:text-[#0a9d73]">
              <li>{translations.privacy.section2Item1}</li>
              <li>{translations.privacy.section2Item2}</li>
              <li>{translations.privacy.section2Item3}</li>
              <li>{translations.privacy.section2Item4}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">{translations.privacy.section3Title}</h2>
            <p>
              {translations.privacy.section3Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">{translations.privacy.section4Title}</h2>
            <p>
              {translations.privacy.section4Body}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight">{translations.privacy.section5Title}</h2>
            <p>
              {translations.privacy.section5Body}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#475467] marker:text-[#0a9d73]">
              <li>{translations.privacy.section5Item1}</li>
              <li>{translations.privacy.section5Item2}</li>
              <li>{translations.privacy.section5Item3}</li>
              <li>{translations.privacy.section5Item4}</li>
            </ul>
            <div className="pt-4">
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