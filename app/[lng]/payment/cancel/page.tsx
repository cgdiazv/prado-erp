import Link from 'next/link';

export default async function PaymentCancelPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {isEs ? 'Pago cancelado' : 'Payment canceled'}
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          {isEs
            ? 'No se realizo ningun cargo. Puedes volver a usar el enlace de pago cuando quieras.'
            : 'No charge was made. You can use the payment link again whenever you are ready.'}
        </p>
        <div className="mt-6">
          <Link href={`/${locale}`} className="inline-flex rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            {isEs ? 'Volver al inicio' : 'Back to home'}
          </Link>
        </div>
      </div>
    </main>
  );
}
