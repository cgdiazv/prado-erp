'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTranslations } from '@/lib/translations';

interface JobRow {
  id: string;
  scheduled_date: string;
  job_type: string;
  cost_amount: number | string | null;
  status: string | null;
  properties?: {
    street_address?: string | null;
  } | null;
}

interface CustomerJobLogTableProps {
  jobs: JobRow[];
  locale?: string;
}

type StatusFilter = 'all' | 'scheduled' | 'completed';

export default function CustomerJobLogTable({ jobs, locale = 'en' }: CustomerJobLogTableProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredJobs = useMemo(() => {
    if (statusFilter === 'all') return jobs;
    return jobs.filter((job) => (job.status || '').toLowerCase() === statusFilter);
  }, [jobs, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const scheduledLabel = isEs ? 'Programados' : 'Scheduled';
  const completedLabel = translations.dashboard.completed;
  const rowsPerPageLabel = isEs ? 'Filas por pagina' : 'Rows per page';
  const prevPageLabel = isEs ? 'Anterior' : 'Prev';
  const nextPageLabel = isEs ? 'Siguiente' : 'Next';
  const pageLabel = isEs ? 'Pagina' : 'Page';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Desktop filter buttons */}
        <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'all' as const, label: translations.dashboard.filterAll },
            { key: 'scheduled' as const, label: scheduledLabel },
            { key: 'completed' as const, label: completedLabel },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 cursor-pointer ${
                statusFilter === filter.key
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        {/* Mobile filter dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="sm:hidden text-xs bg-white border border-gray-300 rounded-md px-3 py-1.5 text-slate-700 w-full"
        >
          {[
            { key: 'all' as const, label: translations.dashboard.filterAll },
            { key: 'scheduled' as const, label: scheduledLabel },
            { key: 'completed' as const, label: completedLabel },
          ].map((filter) => (
            <option key={filter.key} value={filter.key}>
              {filter.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="job-log-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {rowsPerPageLabel}
          </label>
          <select
            id="job-log-page-size"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="text-xs bg-white border border-gray-300 rounded-md px-2 py-1.5 text-slate-700"
          >
            {[25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {prevPageLabel}
          </button>

          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {pageLabel} {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nextPageLabel}
          </button>
        </div>
      </div>

      <section className="border border-gray-200 bg-white rounded-xl overflow-hidden shadow-xs">
        {filteredJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="p-4 table-date-column">{translations.dashboard.date}</th>
                  <th className="p-4">{translations.dashboard.location}</th>
                  <th className="p-4">{translations.dashboard.type}</th>
                  <th className="p-4 text-right">{translations.dashboard.cost}</th>
                  <th className="p-4 text-right">{translations.dashboard.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedJobs.map((job) => {
                  const normalizedStatus = (job.status || '').toLowerCase();
                  const statusLabel =
                    normalizedStatus === 'completed'
                      ? completedLabel
                      : normalizedStatus === 'scheduled'
                        ? scheduledLabel
                        : job.status || '—';

                  return (
                    <tr key={job.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-slate-700 whitespace-nowrap table-date-column">
                        {new Date(`${job.scheduled_date}T00:00:00`).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900">{job.properties?.street_address || '—'}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800">{job.job_type}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">${Number(job.cost_amount || 0).toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          normalizedStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 font-medium text-xs">{translations.dashboard.noJobsLogged}</div>
        )}
      </section>
    </div>
  );
}