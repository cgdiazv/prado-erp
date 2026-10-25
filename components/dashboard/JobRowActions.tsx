'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Check,
  MoreHorizontal,
  Clock,
  Calendar,
  DollarSign,
  Trash2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { archiveJob, restoreJob } from '@/app/actions';

interface JobRowActionsProps {
  job: any;
  trucks: Array<{ id: string; name: string; plate_number?: string | null }>;
  locale?: string;
  translations: any;
  onComplete: (job: any) => void;
  onOpenScheduleDetails: (job: any) => void;
  onCreateDeposit: (job: any) => Promise<void>;
  isCreatingDeposit: boolean;
  onDownloadICS: (jobData: any) => void;
}

export default function JobRowActions({
  job,
  trucks,
  locale = 'en',
  translations,
  onComplete,
  onOpenScheduleDetails,
  onCreateDeposit,
  isCreatingDeposit,
  onDownloadICS,
}: JobRowActionsProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const router = useRouter();
  const [isPendingArchive, startArchiveTransition] = useTransition();

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

  const isArchived = job.status === 'archived';
  const isScheduled = job.status === 'scheduled';
  const isCompleted = job.status === 'completed';

  const handleArchiveToggle = () => {
    const confirmMessage = isArchived
      ? (isEs ? '¿Seguro que quieres restaurar este trabajo?' : 'Are you sure you want to restore this job?')
      : (isEs ? '¿Seguro que quieres archivar este trabajo?' : 'Are you sure you want to archive this job?');

    if (window.confirm(confirmMessage)) {
      startArchiveTransition(async () => {
        const result = isArchived ? await restoreJob(job.id) : await archiveJob(job.id);
        if (result?.error) {
          window.alert(result.error);
          return;
        }
        router.refresh();
      });
    }
  };

  const vehicleName = job.truck_id
    ? (trucks.find((t) => t.id === job.truck_id)?.name ?? null)
    : null;

  return (
    <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
      {/* PRIMARY ACTION / STATE BADGE */}
      {isScheduled ? (
        <button
          type="button"
          onClick={() => onComplete(job)}
          title={translations.dashboard.markDone}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{isEs ? 'Completar' : 'Complete'}</span>
        </button>
      ) : isArchived ? (
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 shadow-2xs select-none">
            {translations.dashboard.archived}
          </span>
          <button
            type="button"
            onClick={handleArchiveToggle}
            disabled={isPendingArchive}
            title={isEs ? 'Restaurar trabajo' : 'Restore job'}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition duration-150 cursor-pointer disabled:opacity-50"
          >
            {isPendingArchive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>{isEs ? 'Restaurar' : 'Restore'}</span>
          </button>
        </div>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200/90 shadow-2xs select-none">
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
          <span>{translations.dashboard.completed}</span>
          {job.completion_photos && job.completion_photos.length > 0 ? (
            <span
              className="ml-0.5 text-emerald-800 font-semibold"
              title={`${job.completion_photos.length} photos`}
            >
              📷 {job.completion_photos.length}
            </span>
          ) : null}
        </span>
      )}

      {/* MORE ACTIONS TRIGGER BUTTON (...) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isPendingArchive}
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
            {/* Header label */}
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-gray-100 mb-1">
              {isEs ? 'Acciones secundarias' : 'More Actions'}
            </div>

            {/* Schedule details */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenScheduleDetails(job);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{translations.dashboard.scheduleDetails}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {isEs ? 'Reasignar fecha o vehículo' : 'Reschedule or reassign vehicle'}
                </span>
              </div>
            </button>

            {/* Create 50% deposit invoice (available for scheduled jobs) */}
            {isScheduled && (
              <button
                type="button"
                role="menuitem"
                disabled={isCreatingDeposit}
                onClick={() => {
                  setIsOpen(false);
                  onCreateDeposit(job);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCreatingDeposit ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                ) : (
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate">
                    {isEs ? 'Factura de anticipo (50%)' : 'Create 50% deposit invoice'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal truncate">
                    {isEs ? 'Cobro previo al trabajo' : 'Collect deposit before work'}
                  </span>
                </div>
              </button>
            )}

            {/* Export to calendar (.ics) */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onDownloadICS({
                  id: job.id,
                  scheduled_date: (job.scheduled_date || '').slice(0, 10),
                  job_type: job.job_type,
                  cost_amount: job.cost_amount,
                  street_address: job.properties?.street_address,
                  truck_name: vehicleName,
                });
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">
                  {isEs ? 'Exportar a calendario (.ics)' : 'Export to calendar (.ics)'}
                </span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  {isEs ? 'Apple, Google o Outlook' : 'Apple, Google or Outlook'}
                </span>
              </div>
            </button>

            <div className="my-1 border-t border-gray-100" />

            {/* Archive or Restore Job */}
            <button
              type="button"
              role="menuitem"
              disabled={isPendingArchive}
              onClick={() => {
                setIsOpen(false);
                handleArchiveToggle();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                isArchived
                  ? 'text-emerald-700 hover:bg-emerald-50'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              {isPendingArchive ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : isArchived ? (
                <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="truncate">
                  {isArchived
                    ? (isEs ? 'Restaurar trabajo' : 'Restore job')
                    : (isEs ? 'Archivar trabajo' : 'Archive job')}
                </span>
                <span
                  className={`text-[10px] font-normal truncate ${
                    isArchived ? 'text-emerald-600/70' : 'text-red-500/70'
                  }`}
                >
                  {isArchived
                    ? (isEs ? 'Devolver al cronograma activo' : 'Return to active schedule')
                    : (isEs ? 'Ocultar del cronograma activo' : 'Hide from active schedule')}
                </span>
              </div>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
