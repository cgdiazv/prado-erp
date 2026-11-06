'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangeModalProps {
  title: string;
  applyLabel: string;
  cancelLabel: string;
  last30DaysLabel: string;
  thisQuarterLabel: string;
  yearToDateLabel: string;
  initialStart: string;
  initialEnd: string;
  locale: string;
  onApply: (start: string, end: string) => void;
  onCancel: () => void;
}

export function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function today() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function DateRangeModal({
  title,
  applyLabel,
  cancelLabel,
  last30DaysLabel,
  thisQuarterLabel,
  yearToDateLabel,
  initialStart,
  initialEnd,
  locale,
  onApply,
  onCancel,
}: DateRangeModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(initialStart));

  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const weekStart = isEs ? 1 : 0;
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const weekday = (weekStart + index) % 7;
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2023, 0, 1 + weekday));
  });

  const presets = [
    {
      label: last30DaysLabel,
      range: (): [Date, Date] => {
        const end = today();
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        return [start, end];
      },
    },
    {
      label: thisQuarterLabel,
      range: (): [Date, Date] => {
        const end = today();
        return [new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1), end];
      },
    },
    {
      label: yearToDateLabel,
      range: (): [Date, Date] => {
        const end = today();
        return [new Date(end.getFullYear(), 0, 1), end];
      },
    },
  ];

  const selectDay = (value: string) => {
    // A complete range (or a pick before the start) begins a new selection.
    if (!draftStart || draftEnd || value < draftStart) {
      setDraftStart(value);
      setDraftEnd('');
      return;
    }
    setDraftEnd(value);
  };

  const todayValue = toDateValue(today());
  const rangeIsValid = Boolean(draftStart && draftEnd && draftStart <= draftEnd);
  const summaryFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl outline-none sm:p-5"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const [start, end] = preset.range();
                setDraftStart(toDateValue(start));
                setDraftEnd(toDateValue(end));
                setVisibleMonth(new Date(end.getFullYear(), end.getMonth() - 1, 1));
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label={isEs ? 'Meses anteriores' : 'Previous months'}
            onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <div className="flex flex-1 justify-around gap-4 text-sm font-semibold text-slate-800">
            {[0, 1].map((offset) => (
              <span key={offset} className={offset === 1 ? 'hidden sm:inline' : ''}>
                {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(addMonths(visibleMonth, offset))}
              </span>
            ))}
          </div>
          <button
            type="button"
            aria-label={isEs ? 'Meses siguientes' : 'Next months'}
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          {[0, 1].map((offset) => {
            const month = addMonths(visibleMonth, offset);
            const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
            const offsetDays = (month.getDay() - weekStart + 7) % 7;
            const cellCount = Math.ceil((offsetDays + daysInMonth) / 7) * 7;

            return (
              <div key={offset} className={offset === 1 ? 'hidden sm:block' : ''}>
                <div className="mb-2 grid grid-cols-7">
                  {weekdayLabels.map((weekday, index) => (
                    <span key={index} className="py-1 text-center text-[10px] font-medium uppercase text-slate-400">
                      {weekday}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array.from({ length: cellCount }, (_, index) => {
                    const day = index - offsetDays + 1;
                    if (day < 1 || day > daysInMonth) {
                      return <span key={index} className="aspect-square" aria-hidden="true" />;
                    }

                    const date = new Date(month.getFullYear(), month.getMonth(), day);
                    const value = toDateValue(date);
                    const isEndpoint = value === draftStart || value === draftEnd;
                    const isInRange = Boolean(draftStart && draftEnd && value > draftStart && value < draftEnd);

                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}
                        aria-pressed={isEndpoint}
                        onClick={() => selectDay(value)}
                        className={`aspect-square rounded-lg text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          isEndpoint
                            ? 'bg-emerald-600 font-semibold text-white hover:bg-emerald-700'
                            : isInRange
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'text-slate-700 hover:bg-slate-100'
                        } ${value === todayValue && !isEndpoint ? 'font-semibold ring-1 ring-inset ring-emerald-300' : ''}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500" aria-live="polite">
            {draftStart && draftEnd
              ? `${summaryFormatter.format(parseDate(draftStart))} – ${summaryFormatter.format(parseDate(draftEnd))}`
              : draftStart
                ? isEs ? 'Selecciona la fecha de fin' : 'Select an end date'
                : isEs ? 'Selecciona la fecha de inicio' : 'Select a start date'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={!rangeIsValid}
              onClick={() => onApply(draftStart, draftEnd)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applyLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
