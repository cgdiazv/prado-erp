import Link from 'next/link';

export default async function PaymentSuccessPage({
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
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {isEs ? 'Pago recibido' : 'Payment received'}
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          {isEs
            ? 'Gracias. Tu pago fue enviado correctamente y sera confirmado en breve.'
            : 'Thank you. Your payment was submitted successfully and will be confirmed shortly.'}
        </p>
        <div className="mt-6">
          <Link href={`/${locale}`} className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
            {isEs ? 'Volver al inicio' : 'Back to home'}
          </Link>
        </div>
      </div>
    </main>
  );
}
