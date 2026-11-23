'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Filter, Loader2 } from 'lucide-react';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import { createStripeExpressDashboardLink } from '@/app/[lng]/dashboard/settings/actions/stripeConnectActions';

export interface StripePayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'in_transit' | 'canceled' | 'failed' | string;
  created: number;
  arrivalDate: number;
  method: string;
  failureMessage?: string | null;
}

export interface StripeBalanceTransactionRecord {
  id: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  status: 'available' | 'pending' | string;
  type: string;
  description: string | null;
  created: number;
  availableOn: number;
}

interface StripePayoutsViewProps {
  locale: string;
  stripeConnected: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  currencyCode: string;
  availableBalance: number;
  pendingBalance: number;
  inTransitTotal: number;
  paidLast30DaysTotal: number;
  payouts: StripePayoutRecord[];
  transactions: StripeBalanceTransactionRecord[];
  errorMessage?: string | null;
}

type ActiveTab = 'payouts' | 'transactions';
type PayoutFilter = 'all' | 'paid' | 'in_transit' | 'failed';
type TransactionFilter = 'all' | 'pending' | 'available';

export default function StripePayoutsView({
  locale,
  stripeConnected,
  payoutsEnabled,
  chargesEnabled,
  currencyCode: rawCurrencyCode,
  availableBalance,
  pendingBalance,
  inTransitTotal,
  paidLast30DaysTotal,
  payouts,
  transactions,
  errorMessage,
}: StripePayoutsViewProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const currencyCode = normalizeCurrencyCode(rawCurrencyCode);

  const [activeTab, setActiveTab] = useState<ActiveTab>('payouts');
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>('all');
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all');
  const [openingStripe, setOpeningStripe] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleOpenStripeDashboard = async () => {
    setOpeningStripe(true);
    setPortalError(null);
    try {
      const res = await createStripeExpressDashboardLink();
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else if (res.error) {
        setPortalError(res.error);
      }
    } catch (err: any) {
      setPortalError(err?.message || (isEs ? 'No se pudo abrir Stripe.' : 'Failed to open Stripe dashboard.'));
    } finally {
      setOpeningStripe(false);
    }
  };

  const filteredPayouts = useMemo(() => {
    if (payoutFilter === 'all') return payouts;
    if (payoutFilter === 'in_transit') {
      return payouts.filter((p) => p.status === 'in_transit' || p.status === 'pending');
    }
    return payouts.filter((p) => p.status === payoutFilter);
  }, [payouts, payoutFilter]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter((t) => t.status === txFilter);
  }, [transactions, txFilter]);

  const formatDate = (unixSeconds: number) => {
    if (!unixSeconds) return '—';
    return new Date(unixSeconds * 1000).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          label: isEs ? 'Pagado' : 'Paid',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'in_transit':
        return {
          label: isEs ? 'En tránsito' : 'In Transit',
          className: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'pending':
        return {
          label: isEs ? 'Pendiente' : 'Pending',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'failed':
      case 'canceled':
        return {
          label: status === 'failed' ? (isEs ? 'Fallido' : 'Failed') : (isEs ? 'Cancelado' : 'Canceled'),
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-600 border-slate-200',
        };
    }
  };

  const getTxTypeLabel = (type: string) => {
    switch (type) {
      case 'charge':
      case 'payment':
        return isEs ? 'Cobro de Factura' : 'Invoice Payment';
      case 'payout':
        return isEs ? 'Transferencia Bancaria' : 'Bank Payout';
      case 'refund':
      case 'payment_refund':
        return isEs ? 'Reembolso' : 'Refund';
      case 'adjustment':
        return isEs ? 'Ajuste' : 'Adjustment';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    {
      id: 'payouts',
      label: `${isEs ? 'Pagos Procesados' : 'Processed Payouts'} (${payouts.length})`,
    },
    {
      id: 'transactions',
      label: `${isEs ? 'Transacciones y Pendientes' : 'Pending & Recent Transactions'} (${transactions.length})`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEs ? 'Pagos y Balance de Stripe' : 'Payouts'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isEs
              ? 'Monitorea transacciones pendientes, comisiones de procesamiento y depósitos bancarios de Stripe.'
              : 'Monitor pending transactions, processing fees, and bank payouts from your connected Stripe account.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stripeConnected ? (
            <button
              type="button"
              onClick={handleOpenStripeDashboard}
              disabled={openingStripe}
              className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {openingStripe ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isEs ? 'Abrir Panel de Stripe' : 'Open Stripe Dashboard'}</span>
            </button>
          ) : (
            <Link
              href={`/${locale}/dashboard/settings/integrations`}
              className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm inline-flex items-center gap-1.5"
            >
              <span>{isEs ? 'Conectar Cuenta de Stripe' : 'Connect Stripe Account'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Onboarding / Status Banner if not connected or payouts paused */}
      {!stripeConnected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-950">
              {isEs
                ? 'Tu cuenta de Stripe aún no está conectada'
                : 'Your Stripe account is not connected yet'}
            </p>
            <p className="text-xs text-amber-800">
              {isEs
                ? 'Conecta tu cuenta de Stripe en Configuración para cobrar facturas en línea y recibir depósitos automáticos en tu banco.'
                : 'Connect your Stripe account in Settings to collect online invoice payments and receive automatic bank payouts.'}
            </p>
          </div>
        </div>
      ) : !payoutsEnabled || !chargesEnabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-amber-950">
              {isEs
                ? 'Verificación de Stripe pendiente'
                : 'Stripe verification required for automatic payouts'}
            </p>
            <p className="text-xs text-amber-800">
              {isEs
                ? 'Completa los requisitos bancarios o de identidad en Stripe para activar las transferencias a tu cuenta bancaria.'
                : 'Complete your bank or identity verification details in Stripe to enable automatic bank transfers.'}
            </p>
          </div>
          <Link
            href={`/${locale}/dashboard/settings/integrations`}
            className="shrink-0 bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition text-center"
          >
            {isEs ? 'Revisar Estado' : 'Review Status'}
          </Link>
        </div>
      ) : null}

      {(errorMessage || portalError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
          {portalError || errorMessage}
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Balance Pendiente' : 'Pending Balance'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(pendingBalance, currencyCode)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isEs ? 'Pagos en proceso de liquidación' : 'Customer payments clearing'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Disponible para Pago' : 'Available for Payout'}
          </span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatCurrency(availableBalance, currencyCode)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isEs ? 'Listo para próxima transferencia' : 'Cleared for next bank transfer'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'En Tránsito al Banco' : 'In Transit to Bank'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(inTransitTotal, currencyCode)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isEs ? 'Enviado hacia tu cuenta bancaria' : 'Currently on the way to bank'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
            {isEs ? 'Depositado (Últimos 30d)' : 'Processed Payouts (30d)'}
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(paidLast30DaysTotal, currencyCode)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isEs ? 'Total depositado en tu banco' : 'Net deposited in last 30 days'}
          </p>
        </div>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={isEs ? 'Pestañas de pagos de Stripe' : 'Stripe payouts tabs'}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap pb-3 pt-1 px-1 text-sm transition-all border-b-[3px] cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Processed Payouts */}
      {activeTab === 'payouts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="relative inline-flex items-center">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <select
                value={payoutFilter}
                onChange={(e) => setPayoutFilter(e.target.value as PayoutFilter)}
                className="text-xs bg-white border border-gray-300 rounded-md pl-8 pr-7 py-1.5 text-slate-700 font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition cursor-pointer"
              >
                <option value="all">{isEs ? 'Todos los estados' : 'All statuses'}</option>
                <option value="paid">{isEs ? 'Pagados (Depositados)' : 'Paid (Deposited)'}</option>
                <option value="in_transit">{isEs ? 'En tránsito / Pendientes' : 'In Transit / Pending'}</option>
                <option value="failed">{isEs ? 'Fallidos' : 'Failed'}</option>
              </select>
            </div>
          </div>

          {filteredPayouts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                  <tr>
                    <th className="px-4 py-3 table-date-column">{isEs ? 'Fecha Inicio' : 'Initiated'}</th>
                    <th className="px-4 py-3 table-date-column">{isEs ? 'Llegada Estimada' : 'Arrival Date'}</th>
                    <th className="px-4 py-3">{isEs ? 'Estado' : 'Status'}</th>
                    <th className="px-4 py-3">{isEs ? 'Método' : 'Method'}</th>
                    <th className="px-4 py-3 text-right">{isEs ? 'Monto Depositado' : 'Payout Amount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPayouts.map((payout) => {
                    const badge = getPayoutStatusBadge(payout.status);
                    const rowCurrency = normalizeCurrencyCode(payout.currency);
                    return (
                      <tr key={payout.id} className="hover:bg-gray-50/50 transition duration-150">
                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap table-date-column">
                          {formatDate(payout.created)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap table-date-column">
                          {formatDate(payout.arrivalDate)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {payout.failureMessage && (
                            <span className="block text-[11px] text-rose-600 mt-0.5">
                              {payout.failureMessage}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 capitalize">
                          {payout.method === 'instant'
                            ? isEs
                              ? 'Instantáneo'
                              : 'Instant'
                            : isEs
                            ? 'Transferencia Bancaria'
                            : 'Standard Bank Transfer'}
                        </td>
                        <td className="px-4 py-3 text-xs text-right font-bold text-slate-900">
                          {formatCurrency(payout.amount, rowCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-xs text-slate-400">
              {isEs
                ? 'No hay pagos procesados o en tránsito para mostrar.'
                : 'No processed or in-transit payouts found.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pending & Recent Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="relative inline-flex items-center">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <select
                value={txFilter}
                onChange={(e) => setTxFilter(e.target.value as TransactionFilter)}
                className="text-xs bg-white border border-gray-300 rounded-md pl-8 pr-7 py-1.5 text-slate-700 font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition cursor-pointer"
              >
                <option value="all">{isEs ? 'Todas las transacciones' : 'All transactions'}</option>
                <option value="pending">{isEs ? 'Pendientes de liquidación' : 'Pending (Clearing)'}</option>
                <option value="available">{isEs ? 'Liquidadas (Disponibles)' : 'Cleared (Available)'}</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                  <tr>
                    <th className="px-4 py-3 table-date-column">{isEs ? 'Fecha' : 'Date'}</th>
                    <th className="px-4 py-3 table-date-column">{isEs ? 'Disponible el' : 'Available On'}</th>
                    <th className="px-4 py-3">{isEs ? 'Tipo / Concepto' : 'Type / Description'}</th>
                    <th className="px-4 py-3">{isEs ? 'Estado' : 'Status'}</th>
                    <th className="px-4 py-3 text-right">{isEs ? 'Bruto' : 'Gross'}</th>
                    <th className="px-4 py-3 text-right">{isEs ? 'Comisión Stripe' : 'Stripe Fee'}</th>
                    <th className="px-4 py-3 text-right">{isEs ? 'Neto' : 'Net'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredTransactions.map((tx) => {
                    const rowCurrency = normalizeCurrencyCode(tx.currency);
                    const isPending = tx.status === 'pending';
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition duration-150">
                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap table-date-column">
                          {formatDate(tx.created)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap table-date-column">
                          {formatDate(tx.availableOn)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-800">
                          <span className="font-semibold text-slate-900 block">
                            {getTxTypeLabel(tx.type)}
                          </span>
                          {tx.description && (
                            <span className="text-[11px] text-slate-400 truncate block max-w-xs">
                              {tx.description}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isPending
                              ? isEs
                                ? 'Pendiente'
                                : 'Pending'
                              : isEs
                              ? 'Disponible'
                              : 'Available'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right text-slate-700">
                          {formatCurrency(tx.amount, rowCurrency)}
                        </td>
                        <td className="px-4 py-3 text-xs text-right text-slate-500">
                          {tx.fee > 0 ? `-${formatCurrency(tx.fee, rowCurrency)}` : formatCurrency(0, rowCurrency)}
                        </td>
                        <td className="px-4 py-3 text-xs text-right font-bold text-slate-900">
                          {formatCurrency(tx.net, rowCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-xs text-slate-400">
              {isEs
                ? 'No se encontraron transacciones de Stripe para este filtro.'
                : 'No Stripe transactions found for this filter.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
