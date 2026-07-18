import Link from 'next/link';
import { createAdminClient } from '@/lib/supabaseServer';

export default async function PaymentSuccessPage({
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
  let organizationSlogan = isEs ? 'Pago recibido correctamente.' : 'Payment received successfully.';
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
            ? 'Gracias. Tu pago fue enviado correctamente al proveedor y sera confirmado en breve.'
            : 'Thank you. Your payment was submitted to the service provider and will be confirmed shortly.'}
        </p>
        <div className="mt-6">
          <Link href={`/${locale}`} className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
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
