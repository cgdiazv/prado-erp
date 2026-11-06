'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import DateRangeModal, { parseDate } from '@/components/dashboard/DateRangeModal';

type ReportType = 'revenue' | 'expenses' | 'jobs' | 'customers' | 'estimates' | 'schedule';
type PeriodType = '30d' | 'quarter' | 'year' | 'custom';

interface PrintReportFiltersProps {
  reportTypes: ReportType[];
  periodTypes: PeriodType[];
  reportLabels: Record<ReportType, string>;
  periodLabels: Record<PeriodType, string>;
  selectedReport: ReportType;
  selectedPeriod: PeriodType;
  customStartValue: string;
  customEndValue: string;
  locale: string;
  sectionTitle: string;
  periodLabel: string;
  periodCustomLabel: string;
  selectRangeLabel: string;
  applyRangeLabel: string;
  cancelLabel: string;
  last30DaysLabel: string;
  thisQuarterLabel: string;
  yearToDateLabel: string;
  generateLabel: string;
}

export default function PrintReportFilters({
  reportTypes,
  periodTypes,
  reportLabels,
  periodLabels,
  selectedReport,
  selectedPeriod,
  customStartValue,
  customEndValue,
  locale,
  sectionTitle,
  periodLabel,
  periodCustomLabel,
  selectRangeLabel,
  applyRangeLabel,
  cancelLabel,
  last30DaysLabel,
  thisQuarterLabel,
  yearToDateLabel,
  generateLabel,
}: PrintReportFiltersProps) {
  const [period, setPeriod] = useState<PeriodType>(selectedPeriod);
  const [previousPeriod, setPreviousPeriod] = useState<PeriodType>(selectedPeriod === 'custom' ? '30d' : selectedPeriod);
  const [hasCustomRange, setHasCustomRange] = useState(selectedPeriod === 'custom');
  const [rangeStart, setRangeStart] = useState(customStartValue);
  const [rangeEnd, setRangeEnd] = useState(customEndValue);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rangeFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const rangeText = `${rangeFormatter.format(parseDate(rangeStart))} – ${rangeFormatter.format(parseDate(rangeEnd))}`;

  const cancelModal = () => {
    setIsModalOpen(false);
    // Leaving "Custom range" without ever choosing dates restores the previous period.
    if (!hasCustomRange) setPeriod(previousPeriod);
  };

  return (
    <form className="grid grid-cols-1 gap-3 items-end md:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(17rem,1.25fr)_auto]" method="get">
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-500 uppercase">{sectionTitle}</label>
        <select
          name="report"
          defaultValue={selectedReport}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
        >
          {reportTypes.map((report) => (
            <option key={report} value={report}>
              {reportLabels[report]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-500 uppercase">{periodLabel}</label>
        <select
          name="period"
          value={period}
          onChange={(event) => {
            const next = event.target.value as PeriodType;
            if (next === 'custom') {
              if (period !== 'custom') setPreviousPeriod(period);
              setIsModalOpen(true);
            }
            setPeriod(next);
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
        >
          {periodTypes.map((periodOption) => (
            <option key={periodOption} value={periodOption}>
              {periodLabels[periodOption]}
            </option>
          ))}
        </select>
      </div>

      {period === 'custom' && hasCustomRange && (
        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase text-gray-500">{periodCustomLabel}</span>
          <input type="hidden" name="start" value={rangeStart} />
          <input type="hidden" name="end" value={rangeEnd} />
          <button
            type="button"
            aria-label={`${selectRangeLabel}: ${rangeText}`}
            onClick={() => setIsModalOpen(true)}
            className="inline-flex min-h-10 w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-xs transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="min-w-0 flex-1 truncate">{rangeText}</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <DateRangeModal
          title={periodCustomLabel}
          applyLabel={applyRangeLabel}
          cancelLabel={cancelLabel}
          last30DaysLabel={last30DaysLabel}
          thisQuarterLabel={thisQuarterLabel}
          yearToDateLabel={yearToDateLabel}
          initialStart={rangeStart}
          initialEnd={rangeEnd}
          locale={locale}
          onApply={(start, end) => {
            setRangeStart(start);
            setRangeEnd(end);
            setHasCustomRange(true);
            setIsModalOpen(false);
          }}
          onCancel={cancelModal}
        />
      )}

      <div>
        <button
          type="submit"
          className="print-hidden text-xs font-semibold px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
        >
          {generateLabel}
        </button>
      </div>
    </form>
  );
}
