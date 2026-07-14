'use client';

import { useState } from 'react';
import DateRangePopover from '@/components/dashboard/DateRangePopover';

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
  sectionTitle: string;
  periodLabel: string;
  periodCustomLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  selectRangeLabel: string;
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
  sectionTitle,
  periodLabel,
  periodCustomLabel,
  startDateLabel,
  endDateLabel,
  selectRangeLabel,
  generateLabel,
}: PrintReportFiltersProps) {
  const [period, setPeriod] = useState<PeriodType>(selectedPeriod);

  return (
    <form className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end" method="get">
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
          onChange={(event) => setPeriod(event.target.value as PeriodType)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
        >
          {periodTypes.map((periodOption) => (
            <option key={periodOption} value={periodOption}>
              {periodLabels[periodOption]}
            </option>
          ))}
        </select>
      </div>

      {period === 'custom' && (
        <div className="lg:col-span-2">
          <DateRangePopover
            label={periodCustomLabel}
            startLabel={startDateLabel}
            endLabel={endDateLabel}
            buttonLabel={selectRangeLabel}
            startName="start"
            endName="end"
            initialStart={customStartValue}
            initialEnd={customEndValue}
          />
        </div>
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
