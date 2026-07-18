import Link from 'next/link';

interface AccessPendingPageProps {
  params: Promise<{ lng?: string }>;
}

export default async function AccessPendingPage({ params }: AccessPendingPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {isEs ? 'Acceso en revision' : 'Access pending'}
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {isEs
            ? 'Tu cuenta ya inicio sesion, pero el acceso a tu organizacion aun no se pudo resolver. Si acabas de aceptar una invitacion, espera unos segundos y vuelve a intentar.'
            : 'Your account is signed in, but organization access could not be resolved yet. If you just accepted an invitation, wait a moment and try again.'}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            {isEs ? 'Ir a login' : 'Go to login'}
          </Link>
          <Link
            href={`/${locale}/auth/signout`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {isEs ? 'Cerrar sesion' : 'Sign out'}
          </Link>
        </div>
      </section>
    </main>
  );
}
