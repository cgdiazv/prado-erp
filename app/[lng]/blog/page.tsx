import Link from 'next/link';
import Script from 'next/script';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';

export default async function BlogPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const isEs = lng.toLowerCase().startsWith('es');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <PublicNavbar locale={lng} />

      <main className="flex-1 w-full">
        <section className="border-b border-slate-900 bg-slate-950/60 py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {isEs ? 'Blog y recursos' : 'Blog & resources'}
            </div>
            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              {isEs ? 'Explora nuestras historias y guías' : 'Explore our stories and guides'}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm md:text-base text-slate-400 leading-relaxed">
              {isEs
                ? 'Encuentra ideas prácticas, aprendizajes de operaciones y actualizaciones para equipos de servicio en campo.'
                : 'Find practical ideas, field-service operations insights, and updates for growing service teams.'}
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href={`/${lng}`}
                className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-emerald-700 hover:text-white"
              >
                {isEs ? 'Volver al inicio' : 'Back to home'}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="mx-auto max-w-7xl">
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
