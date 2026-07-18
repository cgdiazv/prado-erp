import Link from 'next/link';
import { createAdminClient } from '@/lib/supabaseServer';

export default async function PaymentCancelPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ invoice?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  const invoiceId = typeof resolvedSearchParams.invoice === 'string' ? resolvedSearchParams.invoice : '';

  let organizationName = isEs ? 'Tu proveedor de servicios' : 'Your service provider';
  let organizationSlogan = isEs ? 'Tu enlace de pago sigue disponible.' : 'Your payment link is still available.';
  let organizationLogoUrl = '';

  if (invoiceId) {
    const supabaseAdmin = createAdminClient();

    const { data: invoiceRow } = await supabaseAdmin
      .from('invoices')
      .select('customer_id')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoiceRow?.customer_id) {
      const { data: customerRow } = await supabaseAdmin
        .from('customers')
        .select('organization_id')
        .eq('id', invoiceRow.customer_id)
        .maybeSingle();

      if (customerRow?.organization_id) {
        const { data: orgRow } = await supabaseAdmin
          .from('organizations')
          .select('name, slogan, logo_url')
          .eq('id', customerRow.organization_id)
          .maybeSingle();

        if (orgRow?.name) {
          organizationName = orgRow.name;
        }
        if (orgRow?.slogan) {
          organizationSlogan = orgRow.slogan;
        }
        if (orgRow?.logo_url) {
          organizationLogoUrl = orgRow.logo_url;
        }
      }
    }
  }

  const fallbackInitial = organizationName.trim().charAt(0).toUpperCase() || 'S';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
        <div className="mb-6 flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          {organizationLogoUrl ? (
            <img
              src={organizationLogoUrl}
              alt={`${organizationName} logo`}
              className="h-8 w-8 rounded-md border border-slate-700 bg-white object-contain"
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
              {fallbackInitial}
            </span>
          )}
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{organizationName}</p>
            <p className="text-xs text-slate-400">{organizationSlogan}</p>
          </div>
        </div>

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
            ? 'No se realizo ningun cargo. Puedes volver a usar el enlace de pago del proveedor cuando quieras.'
            : 'No charge was made. You can use your provider payment link again whenever you are ready.'}
        </p>
        <div className="mt-6">
          <Link href={`/${locale}`} className="inline-flex rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            {isEs ? 'Volver al inicio' : 'Back to home'}
          </Link>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">
            {isEs ? 'Powered by Prado Online Payments' : 'Powered by Prado Online Payments'}
          </p>
        </div>
      </div>
    </main>
  );
}
