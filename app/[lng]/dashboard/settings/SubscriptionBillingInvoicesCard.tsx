'use client';

import { useEffect, useState } from 'react';
import {
  getOrganizationSubscriptionBillingData,
  createSubscriptionBillingPortalSession,
  type SubscriptionBillingSummary,
} from './actions';
import { CreditCard, Download, ExternalLink, FileText } from 'lucide-react';

interface SubscriptionBillingInvoicesCardProps {
  currentSubscriptionStatus: string | null;
  locale?: string;
}

export default function SubscriptionBillingInvoicesCard({
  currentSubscriptionStatus,
  locale = 'en',
}: SubscriptionBillingInvoicesCardProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [billing, setBilling] = useState<SubscriptionBillingSummary | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await getOrganizationSubscriptionBillingData();
        if (active && res.success && res.data) {
          setBilling(res.data);
        }
      } catch (err) {
        console.error('Failed to load subscription billing history:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [currentSubscriptionStatus]);

  const handleOpenBillingPortal = async () => {
    setOpeningPortal(true);
    setPortalError(null);
    try {
      const res = await createSubscriptionBillingPortalSession(locale);
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else if (res.error) {
        setPortalError(res.error);
      }
    } catch (err: any) {
      setPortalError(
        err?.message ||
          (isEs ? 'No se pudo abrir el portal de facturación.' : 'Failed to open billing portal.')
      );
    } finally {
      setOpeningPortal(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatUnixDate = (unixSeconds: number | null) => {
    if (!unixSeconds) return '—';
    return new Date(unixSeconds * 1000).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLocalizedPlanName = (planTier: string) => {
    switch (planTier) {
      case 'individual':
        return isEs ? 'Plan Individual' : 'Individual Plan';
      case 'growth':
        return isEs ? 'Plan Growth' : 'Growth Plan';
      case 'enterprise':
        return isEs ? 'Plan Enterprise' : 'Enterprise Plan';
      default:
        return isEs ? 'Prueba Gratuita (30 Días)' : '30-Day Free Trial';
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'paid':
        return {
          label: isEs ? 'Pagada' : 'Paid',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'open':
        return {
          label: isEs ? 'Pendiente' : 'Open',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'uncollectible':
      case 'void':
        return {
          label: isEs ? 'Anulada' : 'Void',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
        };
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const planTier = billing?.planTier || (currentSubscriptionStatus || 'trial').toLowerCase();
  const isTrial = planTier === 'trial';
  const invoices = billing?.invoices || [];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
            {isEs ? 'Facturación Mensual e Historial de Suscripción' : 'Subscription Billing & Invoices'}
          </h3>
          <p className="text-xs text-slate-500">
            {isEs
              ? 'Consulta tu ciclo de facturación mensual, método de pago y descarga los recibos y facturas de tu suscripción a Prado.'
              : 'Review your monthly billing cycle, payment method on file, and download your Prado subscription invoices and receipts.'}
          </p>
        </div>

        {billing?.hasStripeCustomer ? (
          <button
            type="button"
            onClick={handleOpenBillingPortal}
            disabled={openingPortal}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60 cursor-pointer shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {openingPortal
                ? isEs
                  ? 'Abriendo...'
                  : 'Opening...'
                : isEs
                ? 'Administrar Método de Pago'
                : 'Manage Payment Method'}
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        ) : null}
      </div>

      {portalError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
          {portalError}
        </div>
      ) : null}

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1">
            {isEs ? 'Plan y Tarifa Mensual' : 'Current Plan & Monthly Rate'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-slate-900">
              {loading
                ? '...'
                : `${formatCurrency(billing?.monthlyRate ?? 0, billing?.currency)}/${isEs ? 'mes' : 'mo'}`}
            </span>
            {billing?.referralDiscountActive ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                50% OFF
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 mt-1">{getLocalizedPlanName(planTier)}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1">
            {isTrial
              ? isEs
                ? 'Fin del Periodo de Prueba'
                : 'Trial Period Ends'
              : billing?.cancelAtPeriodEnd
              ? isEs
                ? 'Finaliza el'
                : 'Ends On'
              : isEs
              ? 'Próxima Fecha de Cobro'
              : 'Next Billing Date'}
          </span>
          <span className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-slate-900 block">
            {loading ? '...' : formatUnixDate(billing?.nextBillingDate ?? null)}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            {isTrial
              ? isEs
                ? 'Sin cobro automático durante la prueba'
                : 'No automatic charge during trial'
              : billing?.cancelAtPeriodEnd
              ? isEs
                ? 'Cancelación programada'
                : 'Scheduled to cancel at period end'
              : isEs
              ? 'Renovación mensual automática'
              : 'Automatic monthly renewal'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1">
            {isEs ? 'Método de Pago' : 'Payment Method'}
          </span>
          <span className="text-lg sm:text-xl font-semibold tracking-tight tabular-nums text-slate-900 block">
            {loading
              ? '...'
              : billing?.paymentMethod
              ? `${billing.paymentMethod.brand} •••• ${billing.paymentMethod.last4}`
              : isEs
              ? 'Sin tarjeta registrada'
              : 'No card on file'}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            {billing?.paymentMethod && billing.paymentMethod.expMonth && billing.paymentMethod.expYear
              ? `${isEs ? 'Vence' : 'Expires'} ${String(billing.paymentMethod.expMonth).padStart(2, '0')}/${billing.paymentMethod.expYear}`
              : isEs
              ? 'Procesado de forma segura por Stripe'
              : 'Securely processed via Stripe'}
          </p>
        </div>
      </div>

      {/* Monthly Subscription Invoices Table */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {isEs ? 'Historial de Facturas de Suscripción' : 'Monthly Subscription Invoices'}
          </h4>
          {invoices.length > 0 ? (
            <span className="text-xs text-slate-500">
              {invoices.length} {invoices.length === 1 ? (isEs ? 'factura' : 'invoice') : (isEs ? 'facturas' : 'invoices')}
            </span>
          ) : null}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">{isEs ? 'Factura #' : 'Invoice #'}</th>
                <th className="py-3 px-4">{isEs ? 'Fecha' : 'Billing Date'}</th>
                <th className="py-3 px-4">{isEs ? 'Periodo / Concepto' : 'Billing Period / Plan'}</th>
                <th className="py-3 px-4">{isEs ? 'Monto' : 'Amount'}</th>
                <th className="py-3 px-4">{isEs ? 'Estado' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{isEs ? 'Recibo / PDF' : 'Receipt / PDF'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-xs text-slate-400">
                    {isEs ? 'Cargando historial de facturación...' : 'Loading billing history...'}
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center">
                    <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      {isEs
                        ? 'Aún no hay facturas de suscripción emitidas'
                        : 'No subscription invoices billed yet'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isEs
                        ? 'Tus facturas mensuales y recibos descargables en PDF aparecerán aquí automáticamente en cada ciclo de cobro.'
                        : 'Your monthly subscription invoices and downloadable PDF receipts will appear here automatically on each billing cycle.'}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const badge = getInvoiceStatusBadge(inv.status);
                  const periodText =
                    inv.periodStart && inv.periodEnd && inv.periodStart !== inv.periodEnd
                      ? `${formatUnixDate(inv.periodStart)} – ${formatUnixDate(inv.periodEnd)}`
                      : inv.description || getLocalizedPlanName(planTier);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900">
                        {inv.number}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {formatUnixDate(inv.created)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {periodText}
                      </td>
                      <td className="py-3.5 px-4 font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {inv.hostedInvoiceUrl ? (
                            <a
                              href={inv.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={isEs ? 'Ver factura en línea' : 'View invoice online'}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              <span>{isEs ? 'Ver' : 'View'}</span>
                            </a>
                          ) : null}
                          {inv.invoicePdfUrl ? (
                            <a
                              href={inv.invoicePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={isEs ? 'Descargar PDF' : 'Download PDF'}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </a>
                          ) : null}
                          {!inv.hostedInvoiceUrl && !inv.invoicePdfUrl ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
