'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreHorizontal,
  Pencil,
  Printer,
  BellRing,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface InvoiceRow {
  id: string;
  customer_id: string;
  invoice_number?: number | null;
  due_date: string;
  tax_amount: number;
  total_amount: number;
  currency_code?: string | null;
  status: 'paid' | 'unpaid';
  stripe_payment_url?: string | null;
  job_id?: string | null;
  invoice_type?: string | null;
  notes?: string | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    email?: string | null;
  } | null;
}

interface InvoiceRowActionsProps {
  invoice: InvoiceRow;
  locale?: string;
  translations: any;
  sendingReminderId: string | null;
  onSendReminder: (invoiceId: string) => Promise<void>;
  onEdit: (invoice: InvoiceRow) => void;
  onPrint: (invoice: InvoiceRow) => void;
  onMarkAsPaid: (invoiceId: string, customerId: string) => Promise<void>;
}

export default function InvoiceRowActions({
  invoice,
  locale = 'en',
  translations,
  sendingReminderId,
  onSendReminder,
  onEdit,
  onPrint,
  onMarkAsPaid,
}: InvoiceRowActionsProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMarkingPaid, startMarkPaidTransition] = useTransition();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateCoords = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownEstimatedHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownEstimatedHeight && rect.top > dropdownEstimatedHeight;

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
      openUpward,
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      calculateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const isPaid = invoice.status === 'paid';
  const isOverdue = !isPaid && Boolean(invoice.due_date && new Date(invoice.due_date) < new Date());
  const isSending = sendingReminderId === invoice.id;

  const handleMarkPaidClick = () => {
    setIsOpen(false);
    startMarkPaidTransition(async () => {
      await onMarkAsPaid(invoice.id, invoice.customer_id);
    });
  };

  return (
    <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
      {/* PRIMARY ACTION BUTTON */}
      {isOverdue ? (
        <button
          type="button"
          onClick={() => onSendReminder(invoice.id)}
          disabled={isSending}
          title={isEs ? 'Enviar recordatorio de pago' : 'Send payment reminder'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-xs transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BellRing className="w-3.5 h-3.5" />
          )}
          <span>
            {isSending
              ? (isEs ? 'Enviando...' : 'Sending...')
              : (isEs ? 'Recordatorio' : 'Reminder')}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onPrint(invoice)}
          title={isEs ? 'Imprimir factura (PDF)' : 'Print invoice (PDF)'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-gray-200 hover:border-gray-300 shadow-2xs transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/20"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>PDF</span>
        </button>
      )}

      {/* MORE ACTIONS TRIGGER BUTTON (...) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isSending || isMarkingPaid}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={isEs ? 'Más acciones' : 'More actions'}
        title={isEs ? 'Más acciones' : 'More actions'}
        className={`w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-lg border transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/20 ${
          isOpen
            ? 'bg-slate-100 text-slate-900 border-slate-300 shadow-xs'
            : 'bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-gray-200 shadow-2xs'
        }`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* PORTAL DROPDOWN MENU */}
      {mounted && isOpen && coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
              right: `${coords.right}px`,
              zIndex: 9999,
            }}
            className="w-56 bg-white rounded-xl shadow-xl border border-gray-200/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 mb-1">
              {isEs ? 'Acciones de factura' : 'Invoice Actions'}
            </div>

            {/* Edit Invoice */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onEdit(invoice);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{isEs ? 'Editar factura' : 'Edit invoice'}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {isEs ? 'Modificar montos o notas' : 'Modify amount or notes'}
                </span>
              </div>
            </button>

            {/* Print / View PDF */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onPrint(invoice);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{isEs ? 'Imprimir factura (PDF)' : 'Print invoice (PDF)'}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {isEs ? 'Ver o descargar PDF' : 'View or download PDF'}
                </span>
              </div>
            </button>

            {/* Send Reminder (if unpaid) */}
            {!isPaid && (
              <button
                type="button"
                role="menuitem"
                disabled={isSending}
                onClick={() => {
                  setIsOpen(false);
                  onSendReminder(invoice.id);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                ) : (
                  <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{isEs ? 'Enviar recordatorio' : 'Send reminder'}</span>
                  <span className="text-[10px] text-slate-400 font-normal truncate">
                    {isEs ? 'Notificar por email al cliente' : 'Email reminder to customer'}
                  </span>
                </div>
              </button>
            )}

            {/* Online payment link (if available) */}
            {invoice.stripe_payment_url && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  window.open(invoice.stripe_payment_url!, '_blank', 'noopener,noreferrer');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{isEs ? 'Abrir enlace de pago' : 'Open payment link'}</span>
                  <span className="text-[10px] text-slate-400 font-normal truncate">
                    {isEs ? 'Pasarela de pago Stripe' : 'Stripe checkout link'}
                  </span>
                </div>
              </button>
            )}

            {/* Mark as paid (if unpaid) */}
            {!isPaid && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  role="menuitem"
                  disabled={isMarkingPaid}
                  onClick={handleMarkPaidClick}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isMarkingPaid ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{translations.dashboard.markAsPaid || (isEs ? 'Marcar como pagada' : 'Mark as paid')}</span>
                    <span className="text-[10px] text-emerald-600/70 font-normal truncate">
                      {isEs ? 'Registrar cobro completado' : 'Record payment completed'}
                    </span>
                  </div>
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
