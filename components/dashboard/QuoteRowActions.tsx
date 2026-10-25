'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Check,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Printer,
  X,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface Estimate {
  id: string;
  title: string;
  description: string | null;
  estimated_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'declined';
  customer_id: string;
  property_id: string | null;
  created_at: string;
}

interface QuoteRowActionsProps {
  estimate: Estimate;
  locale: string;
  t: any;
  sendingEstimateId: string | null;
  approvingEstimateId: string | null;
  deletingEstimateId: string | null;
  onSendEstimate: (estimateId: string, isResend?: boolean) => void;
  onStatusChange: (id: string, status: 'draft' | 'sent' | 'approved' | 'declined') => void;
  onDeleteEstimate: (estimateId: string) => void;
  onPrint: (estimateId: string) => void;
}

export default function QuoteRowActions({
  estimate,
  locale,
  t,
  sendingEstimateId,
  approvingEstimateId,
  deletingEstimateId,
  onSendEstimate,
  onStatusChange,
  onDeleteEstimate,
  onPrint,
}: QuoteRowActionsProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);

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

  const isSending = sendingEstimateId === estimate.id;
  const isApproving = approvingEstimateId === estimate.id;
  const isDeleting = deletingEstimateId === estimate.id;

  const isDraft = estimate.status === 'draft';
  const isSent = estimate.status === 'sent';
  const isApproved = estimate.status === 'approved';
  const isDeclined = estimate.status === 'declined';

  return (
    <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
      {/* PRIMARY ACTION / STATE BADGE */}
      {isDraft && (
        <button
          type="button"
          onClick={() => onSendEstimate(estimate.id)}
          disabled={isSending || isDeleting}
          title={isSending ? t.sendingEmail : t.actionMarkSent}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-xs transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{isSending ? t.sendingEmail : t.actionMarkSent}</span>
        </button>
      )}

      {isSent && (
        <button
          type="button"
          onClick={() => onStatusChange(estimate.id, 'approved')}
          disabled={isApproving}
          title={isApproving ? t.approveProcessing : t.actionApproveSchedule}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {isApproving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>{isApproving ? t.approveProcessing : t.actionApproveSchedule}</span>
        </button>
      )}

      {isApproved && (
        <button
          type="button"
          onClick={() => onPrint(estimate.id)}
          title={t.actionPrint}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-gray-200 hover:border-gray-300 shadow-2xs transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/20"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>PDF</span>
        </button>
      )}

      {isDeclined && (
        <button
          type="button"
          onClick={() => onStatusChange(estimate.id, 'draft')}
          title={isEs ? 'Reabrir como borrador' : 'Reopen as draft'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400/20"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isEs ? 'Reabrir' : 'Reopen'}</span>
        </button>
      )}

      {/* MORE ACTIONS TRIGGER BUTTON (...) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isDeleting || isSending || isApproving}
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
              {isEs ? 'Acciones secundarias' : 'More Actions'}
            </div>

            {/* Edit Quote */}
            <Link
              href={`/${locale}/dashboard/estimates/${estimate.id}/edit`}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{t.actionEdit}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {isEs ? 'Modificar líneas y precios' : 'Modify items and pricing'}
                </span>
              </div>
            </Link>

            {/* Resend (if sent, approved, or declined) */}
            {!isDraft && (
              <button
                type="button"
                role="menuitem"
                disabled={isSending}
                onClick={() => {
                  setIsOpen(false);
                  onSendEstimate(estimate.id, true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                ) : (
                  <Send className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{t.actionResend}</span>
                  <span className="text-[10px] text-slate-400 font-normal truncate">
                    {isEs ? 'Reenviar cotización por email' : 'Resend quote via email'}
                  </span>
                </div>
              </button>
            )}

            {/* Print / View PDF */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onPrint(estimate.id);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{t.actionPrint}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {isEs ? 'Ver o descargar PDF' : 'View or download PDF'}
                </span>
              </div>
            </button>

            {/* Decline option (if sent) */}
            {isSent && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onStatusChange(estimate.id, 'declined');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{t.actionDecline}</span>
                    <span className="text-[10px] text-red-500/70 font-normal truncate">
                      {isEs ? 'Marcar como rechazada' : 'Mark quote as declined'}
                    </span>
                  </div>
                </button>
              </>
            )}

            {/* Reopen option (if declined) */}
            {isDeclined && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onStatusChange(estimate.id, 'draft');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">
                      {isEs ? 'Reabrir como borrador' : 'Reopen as draft'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal truncate">
                      {isEs ? 'Volver a estado editable' : 'Return to editable draft'}
                    </span>
                  </div>
                </button>
              </>
            )}

            {/* Delete option (if draft) */}
            {isDraft && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  role="menuitem"
                  disabled={isDeleting}
                  onClick={() => {
                    setIsOpen(false);
                    onDeleteEstimate(estimate.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{t.actionDelete}</span>
                    <span className="text-[10px] text-red-500/70 font-normal truncate">
                      {isEs ? 'Eliminar borrador definitivamente' : 'Permanently delete draft'}
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
