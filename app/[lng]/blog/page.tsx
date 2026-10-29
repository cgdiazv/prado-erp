import Link from 'next/link';
import Script from 'next/script';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';

export default async function BlogPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const isEs = lng.toLowerCase().startsWith('es');

  return (
    <div className="min-h-screen bg-white text-[#101828] flex flex-col selection:bg-[#0a9d73] selection:text-white font-sans">
      <PublicNavbar locale={lng} theme="light" />

      <main className="flex-1 w-full">
        {/* Header Hero */}
        <section className="bg-[#fcfcfd] border-b border-[#eaecf0] py-16 sm:py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#a7f3d0] bg-[#f0fdf9] px-3.5 py-1 text-xs font-semibold text-[#0a9d73]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0a9d73] animate-pulse" />
              <span>{isEs ? 'Blog y Recursos' : 'Blog & Resources'}</span>
            </div>
            <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-[#101828]">
              {isEs ? 'Explora nuestras historias y guías' : 'Explore our stories and guides'}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#667085] leading-relaxed">
              {isEs
                ? 'Encuentra ideas prácticas, aprendizajes de operaciones y actualizaciones para equipos de servicio en campo.'
                : 'Find practical ideas, field-service operations insights, and updates for growing service teams.'}
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href={`/${lng}`}
                className="inline-flex items-center rounded-xl border border-[#d0d5dd] bg-white px-5 py-2.5 text-sm font-semibold text-[#344054] shadow-xs transition hover:bg-[#f9fafb] hover:text-[#101828]"
              >
                {isEs ? 'Volver al inicio' : 'Back to home'}
              </Link>
            </div>
          </div>
        </section>

        {/* Blog Feed Section */}
        <section className="py-12 sm:py-16 px-6 bg-white">
          <div className="mx-auto max-w-6xl">
            <div id="soro-blog" className="w-full" />
            <Script
              src="https://app.trysoro.com/api/embed/b4d76162-6cd8-4826-967c-cfe42cf49354"
              strategy="afterInteractive"
            />
          </div>
        </section>
      </main>

      <Footer locale={lng} />
    </div>
  );
}

