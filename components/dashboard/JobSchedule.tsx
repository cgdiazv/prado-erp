'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DeleteJobButton from '@/components/DeleteJobButton';
import { completeJob, updateJobScheduleDetails } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

type FilterType = 'all' | 'scheduled' | 'completed' | 'archived';
type SortColumn = 'date' | 'address' | 'type' | 'cost' | 'action';
type SortDirection = 'asc' | 'desc';

interface JobScheduleProps {
  jobs: any[] | null;
  trucks: Array<{ id: string; name: string; plate_number?: string | null }>;
  locale?: string;
}

export default function JobSchedule({ jobs, trucks, locale = 'en' }: JobScheduleProps) {
  const router = useRouter();
  const translations = getTranslations(locale);
  const [filter, setFilter] = useState<FilterType>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingTruckId, setEditingTruckId] = useState('');
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  const openScheduleDetails = (job: any) => {
    setEditingJobId(job.id);
    setEditingDate((job.scheduled_date || '').slice(0, 10));
    setEditingTruckId(job.truck_id || '');
  };

  const closeScheduleDetails = () => {
    if (isUpdatingSchedule) return;
    setEditingJobId(null);
    setEditingDate('');
    setEditingTruckId('');
  };

  const handleScheduleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingJobId || !editingDate || isUpdatingSchedule) return;

    setIsUpdatingSchedule(true);
    const result = await updateJobScheduleDetails(editingJobId, editingDate, editingTruckId || null);

    if (result?.error) {
      alert(result.error);
      setIsUpdatingSchedule(false);
      return;
    }

    closeScheduleDetails();
    setIsUpdatingSchedule(false);
    router.refresh();
  };

  const filteredJobs = jobs
    ? filter === 'all'
      ? jobs.filter((job) => job.status !== 'archived')
      : filter === 'archived'
        ? jobs.filter((job) => job.status === 'archived')
      : jobs.filter((job) => job.status === filter)
    : [];

  const sortedJobs = useMemo(() => {
    const getAddress = (job: any) => (job.properties?.street_address || '').toLowerCase();
    const getType = (job: any) => (job.job_type || '').toLowerCase();
    const getCost = (job: any) => Number.parseFloat(String(job.cost_amount || 0));
    const getDate = (job: any) => new Date(job.scheduled_date || 0).getTime();
    const getActionRank = (job: any) => {
      if (job.status === 'scheduled') return 1;
      if (job.status === 'completed') return 2;
      if (job.status === 'archived') return 3;
      return 4;
    };

    const sorted = [...filteredJobs].sort((a, b) => {
      let result = 0;

      if (sortColumn === 'date') {
        result = getDate(a) - getDate(b);
      } else if (sortColumn === 'address') {
        result = getAddress(a).localeCompare(getAddress(b));
      } else if (sortColumn === 'type') {
        result = getType(a).localeCompare(getType(b));
      } else if (sortColumn === 'cost') {
        result = getCost(a) - getCost(b);
      } else if (sortColumn === 'action') {
        result = getActionRank(a) - getActionRank(b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredJobs, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const paginatedJobs = sortedJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  const renderSortIndicator = (column: SortColumn) => (
    <span className="inline-flex flex-col leading-none text-[8px]">
      <span className={sortColumn === column && sortDirection === 'asc' ? 'text-slate-700' : 'text-slate-300'}>▲</span>
      <span className={sortColumn === column && sortDirection === 'desc' ? 'text-slate-700' : 'text-slate-300'}>▼</span>
    </span>
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: translations.dashboard.filterAll },
    { key: 'scheduled', label: translations.dashboard.filterInProgress },
    { key: 'completed', label: translations.dashboard.completed },
    { key: 'archived', label: translations.dashboard.filterArchived },
  ];

  return (
    <>
      {/* Filter tabs + pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition duration-150 ${
                filter === key
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="jobs-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {locale.toLowerCase().startsWith('es') ? 'Registros por pagina' : 'Rows per page'}
          </label>
          <select
            id="jobs-page-size"
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
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locale.toLowerCase().startsWith('es') ? 'Anterior' : 'Prev'}
          </button>

          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {locale.toLowerCase().startsWith('es') ? 'Pagina' : 'Page'} {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locale.toLowerCase().startsWith('es') ? 'Siguiente' : 'Next'}
          </button>
        </div>
      </div>

      {filteredJobs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.date}</span>
                    {renderSortIndicator('date')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('address')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.address}</span>
                    {renderSortIndicator('address')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('type')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.type}</span>
                    {renderSortIndicator('type')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('cost')} className="inline-flex items-center gap-1">
                    <span>{translations.dashboard.cost}</span>
                    {renderSortIndicator('cost')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleSort('action')} className="inline-flex items-center gap-1 justify-end">
                    <span>{translations.dashboard.action}</span>
                    {renderSortIndicator('action')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition duration-150">
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {new Date(job.scheduled_date).toLocaleDateString(locale.toLowerCase().startsWith('es') ? 'es-ES' : 'en-US')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{job.properties?.street_address || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{job.job_type}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">${Number(job.cost_amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* MARK DONE ICON TRIGGER */}
                      {job.status === 'scheduled' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openScheduleDetails(job)}
                            title={translations.dashboard.scheduleDetails}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 rounded-lg transition duration-200 border border-amber-200 shadow-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                            </svg>
                          </button>
                          <form
                            action={async () => {
                              await completeJob(job.id);
                            }}
                          >
                            <button
                              type="submit"
                              title={translations.dashboard.markDone}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg transition duration-200 border border-emerald-200 shadow-xs"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                          </form>
                        </>
                      ) : job.status === 'archived' ? (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 shadow-xs select-none">
                          {translations.dashboard.archived}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md border border-gray-200 shadow-xs select-none">
                          {translations.dashboard.completed}
                        </span>
                      )}

                      {/* CLIENT COMPONENT ISOLATION FOR DELETE INTERACTIVITY */}
                      <DeleteJobButton jobId={job.id} jobStatus={job.status} locale={locale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic">{translations.dashboard.noActiveDispatchLogs}</p>
      )}

      {editingJobId && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-2xl overflow-hidden shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{translations.dashboard.scheduleDetails}</h3>

            <form onSubmit={handleScheduleUpdate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">{translations.dashboard.date}</label>
                <input
                  type="date"
                  required
                  value={editingDate}
                  onChange={(event) => setEditingDate(event.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-semibold">{translations.dashboard.selectTruckOptional}</label>
                <select
                  value={editingTruckId}
                  onChange={(event) => setEditingTruckId(event.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                >
                  <option value="">{translations.dashboard.selectTruckOptional}</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.name}{truck.plate_number ? ` • ${truck.plate_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeScheduleDetails}
                  disabled={isUpdatingSchedule}
                  className="w-1/2 border border-gray-300 hover:bg-gray-50 p-2.5 rounded-lg transition font-bold text-slate-700 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSchedule}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition font-bold"
                >
                  {isUpdatingSchedule ? `${translations.dashboard.updateSchedule}...` : translations.dashboard.updateSchedule}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}