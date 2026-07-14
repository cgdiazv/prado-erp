'use client';

import { useState } from 'react';

interface DateRangePopoverProps {
  label: string;
  startLabel: string;
  endLabel: string;
  buttonLabel: string;
  startName: string;
  endName: string;
  initialStart: string;
  initialEnd: string;
}

export default function DateRangePopover({
  label,
  startLabel,
  endLabel,
  buttonLabel,
  startName,
  endName,
  initialStart,
  initialEnd,
}: DateRangePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  return (
    <div className="space-y-2 relative">
      <label className="block text-xs font-semibold text-gray-500 uppercase">{label}</label>

      <input type="hidden" name={startName} value={startDate} />
      <input type="hidden" name={endName} value={endDate} />

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-left outline-none hover:bg-slate-50"
      >
        {startDate && endDate ? `${startDate} - ${endDate}` : buttonLabel}
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full min-w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg space-y-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{startLabel}</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{endLabel}</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {buttonLabel}
          </button>
        </div>
      )}
    </div>
  );
}
