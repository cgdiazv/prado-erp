'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DeleteJobButton from '@/components/DeleteJobButton';
import { completeJob, updateJobScheduleDetails } from '@/app/actions';
import { getTranslations } from '@/lib/translations';
import { downloadICS } from '@/lib/icsExport';

type FilterType = 'all' | 'scheduled' | 'completed' | 'archived';
type SortColumn = 'date' | 'address' | 'type' | 'truck' | 'cost' | 'action';
type SortDirection = 'asc' | 'desc';
type ScheduleView = 'list' | 'calendar';
type TimelineSpan = 7 | 12 | 14;

interface JobScheduleProps {
  jobs: any[] | null;
  trucks: Array<{ id: string; name: string; plate_number?: string | null }>;
  teamMembers?: Array<{ email: string; first_name?: string; last_name?: string; role: string }> | null;
  locale?: string;
}

export default function JobSchedule({ jobs, trucks, teamMembers, locale = 'en' }: JobScheduleProps) {
  const router = useRouter();
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const dateLocale = isEs ? 'es-ES' : 'en-US';
  const jobsList = jobs || [];
  const [filter, setFilter] = useState<FilterType>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeView, setActiveView] = useState<ScheduleView>('list');
  const [timelineSpan, setTimelineSpan] = useState<TimelineSpan>(12);
  const [timelineStart, setTimelineStart] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingTruckId, setEditingTruckId] = useState('');
  const [editingSubcontractorId, setEditingSubcontractorId] = useState('');
  const [editingSubcontractorPayAmount, setEditingSubcontractorPayAmount] = useState('');
  const [editingIsRecurring, setEditingIsRecurring] = useState(false);
  const [editingRecurrenceIntervalDays, setEditingRecurrenceIntervalDays] = useState('30');
  const [editingAutoChargeEnabled, setEditingAutoChargeEnabled] = useState(false);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  const openScheduleDetails = (job: any) => {
    setEditingJobId(job.id);
    setEditingDate((job.scheduled_date || '').slice(0, 10));
    setEditingTruckId(job.truck_id || '');
    setEditingSubcontractorId(job.subcontractor_id || '');
    setEditingSubcontractorPayAmount(job.subcontractor_pay_amount ? String(job.subcontractor_pay_amount) : '');
    const isRecurring = Boolean(job.is_recurring);
    setEditingIsRecurring(isRecurring);
    setEditingRecurrenceIntervalDays(isRecurring && Number(job.recurrence_interval_days || 0) > 0 ? String(job.recurrence_interval_days) : '30');
    setEditingAutoChargeEnabled(isRecurring ? Boolean(job.auto_charge_enabled) : false);
  };

  const closeScheduleDetails = () => {
    if (isUpdatingSchedule) return;
    setEditingJobId(null);
    setEditingDate('');
    setEditingTruckId('');
    setEditingSubcontractorId('');
    setEditingSubcontractorPayAmount('');
    setEditingIsRecurring(false);
    setEditingRecurrenceIntervalDays('30');
    setEditingAutoChargeEnabled(false);
  };

  const handleScheduleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingJobId || !editingDate || isUpdatingSchedule) return;

    const normalizedInterval = Number.parseInt(editingRecurrenceIntervalDays || '0', 10);
    if (editingIsRecurring && (!Number.isFinite(normalizedInterval) || normalizedInterval < 1)) {
      alert(isEs ? 'La frecuencia debe ser un numero mayor a 0.' : 'Frequency must be a number greater than 0.');
      return;
    }

    setIsUpdatingSchedule(true);
    const result = await updateJobScheduleDetails(editingJobId, editingDate, editingTruckId || null, {
      isRecurring: editingIsRecurring,
      recurrenceIntervalDays: editingIsRecurring ? normalizedInterval : null,
      autoChargeEnabled: editingIsRecurring ? editingAutoChargeEnabled : false,
      subcontractorId: editingSubcontractorId || null,
      subcontractorPayAmount: parseFloat(editingSubcontractorPayAmount || '0'),
    });

    if (result?.error) {
      alert(result.error);
      setIsUpdatingSchedule(false);
      return;
    }

    closeScheduleDetails();
    setIsUpdatingSchedule(false);
    router.refresh();
  };

  const filteredJobs = jobsList
    ? filter === 'all'
      ? jobsList.filter((job) => job.status !== 'archived')
      : filter === 'archived'
        ? jobsList.filter((job) => job.status === 'archived')
      : jobsList.filter((job) => job.status === filter)
    : [];

  const scheduledJobsCount = jobsList.filter((job) => job.status === 'scheduled').length;
  const completedJobsCount = jobsList.filter((job) => job.status === 'completed').length;
  const unassignedJobsCount = jobsList.filter(
    (job) => job.status !== 'archived' && !job.truck_id
  ).length;

  const sortedJobs = useMemo(() => {
    const truckNameById = new Map(trucks.map((truck) => [truck.id, truck.name]));
    const getAddress = (job: any) => (job.properties?.street_address || '').toLowerCase();
    const getType = (job: any) => (job.job_type || '').toLowerCase();
    const getTruck = (job: any) => (
      (job.truck_id ? (truckNameById.get(job.truck_id) || '') : (isEs ? 'sin asignar' : 'unassigned'))
        .toLowerCase()
    );
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
      } else if (sortColumn === 'truck') {
        result = getTruck(a).localeCompare(getTruck(b));
      } else if (sortColumn === 'cost') {
        result = getCost(a) - getCost(b);
      } else if (sortColumn === 'action') {
        result = getActionRank(a) - getActionRank(b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filteredJobs, isEs, sortColumn, sortDirection, trucks]);

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

  const formatJobDate = (value: string | null | undefined) => {
    if (!value) return '—';
    const normalized = value.length === 10 ? `${value}T00:00:00` : value;
    return new Date(normalized).toLocaleDateString(dateLocale);
  };

  const toDateKey = (value: string | null | undefined) => {
    if (!value) return null;
    return value.slice(0, 10);
  };

  const getDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const calendarJobs = useMemo(
    () => jobsList.filter((job) => (job.status === 'scheduled' || job.status === 'completed') && Boolean(toDateKey(job.scheduled_date))),
    [jobsList]
  );

  const timelineDays = useMemo(() => {
    return Array.from({ length: timelineSpan }, (_, index) => {
      const date = new Date(timelineStart);
      date.setDate(timelineStart.getDate() + index);
      return {
        key: getDateKey(date),
        shortLabel: new Intl.DateTimeFormat(dateLocale, {
          weekday: 'short',
          day: 'numeric',
        }).format(date),
      };
    });
  }, [dateLocale, timelineSpan, timelineStart]);

  const timelineRangeLabel = useMemo(() => {
    const end = new Date(timelineStart);
    end.setDate(timelineStart.getDate() + (timelineSpan - 1));
    const rangeFormat = new Intl.DateTimeFormat(dateLocale, { month: 'short', day: 'numeric' });
    return `${rangeFormat.format(timelineStart)} - ${rangeFormat.format(end)}`;
  }, [dateLocale, timelineSpan, timelineStart]);

  const timelineRows = useMemo(() => {
    const rows = [
      {
        id: '__unassigned__',
        label: isEs ? 'Sin asignar' : 'Unassigned',
        isUnassigned: true,
      },
      ...trucks.map((truck) => ({
        id: truck.id,
        label: truck.name,
        isUnassigned: false,
      })),
    ];

    return rows.map((row) => {
      const jobsByDay = new Map<string, any[]>();

      for (const day of timelineDays) {
        const dayJobs = calendarJobs.filter((job) => {
          const sameDay = toDateKey(job.scheduled_date) === day.key;
          if (!sameDay) return false;
          if (row.isUnassigned) return !job.truck_id;
          return job.truck_id === row.id;
        });
        jobsByDay.set(day.key, dayJobs);
      }

      return {
        ...row,
        jobsByDay,
      };
    });
  }, [calendarJobs, isEs, timelineDays, trucks]);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-x-visible mb-2 sm:mb-5 md:mb-2">
        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
            {isEs ? 'Jobs Agendados' : 'Scheduled Jobs'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">{scheduledJobsCount}</p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
            {isEs ? 'Jobs Completados' : 'Completed Jobs'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">{completedJobsCount}</p>
        </div>

        <div className="flex-shrink-0 w-[calc(50%-4px)] sm:w-auto bg-white border border-gray-200 p-2.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-red-600">
            {isEs ? 'Sin Camion Asignado' : 'Unassigned Truck Jobs'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">{unassignedJobsCount}</p>
        </div>
      </div>

      <div className="mb-3 sm:mb-6 md:mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeView === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isEs ? 'Lista' : 'List'}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('calendar')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeView === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isEs ? 'Calendario' : 'Calendar'}
          </button>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {calendarJobs.length} {isEs ? 'en calendario' : 'in calendar'}
        </span>
      </div>

      {activeView === 'list' ? (
        <>
      {/* Filter tabs + pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 md:mb-3">
        {/* Desktop filter buttons */}
        <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
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
        
        {/* Mobile filter dropdown */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="sm:hidden text-xs bg-white border border-gray-300 rounded-md px-3 py-1.5 text-slate-700 w-full"
        >
          {filters.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="jobs-page-size" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {isEs ? 'Registros por pagina' : 'Rows per page'}
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
            {isEs ? 'Anterior' : 'Prev'}
          </button>

          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {isEs ? 'Pagina' : 'Page'} {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEs ? 'Siguiente' : 'Next'}
          </button>
        </div>
      </div>

      {filteredJobs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3 table-date-column">
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
                  <button type="button" onClick={() => handleSort('truck')} className="inline-flex items-center gap-1">
                    <span>{isEs ? 'Camión' : 'Truck'}</span>
                    {renderSortIndicator('truck')}
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
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap table-date-column">
                    {formatJobDate(job.scheduled_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{job.properties?.street_address || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{job.job_type}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {job.truck_id
                      ? (trucks.find((t) => t.id === job.truck_id)?.name ?? (isEs ? 'Sin asignar' : 'Unassigned'))
                      : (isEs ? 'Sin asignar' : 'Unassigned')}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    ${Number(job.cost_amount || 0).toFixed(2)}
                    {Number(job.subcontractor_pay_amount || 0) > 0 ? (
                      <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                        {isEs ? 'Margen:' : 'Margin:'} ${(Number(job.cost_amount || 0) - Number(job.subcontractor_pay_amount || 0)).toFixed(2)}
                      </span>
                    ) : null}
                  </td>
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
                          <button
                            type="button"
                            onClick={() => downloadICS({
                              id: job.id,
                              scheduled_date: (job.scheduled_date || '').slice(0, 10),
                              job_type: job.job_type,
                              cost_amount: job.cost_amount,
                              street_address: job.properties?.street_address,
                              truck_name: job.truck_id ? (trucks.find((t) => t.id === job.truck_id)?.name ?? null) : null,
                            })}
                            title={isEs ? 'Exportar al calendario' : 'Export to calendar'}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-lg transition duration-200 border border-blue-200 shadow-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
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
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = new Date(timelineStart);
                  next.setDate(timelineStart.getDate() - timelineSpan);
                  setTimelineStart(next);
                }}
                className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50"
              >
                {isEs ? 'Anterior' : 'Prev'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setTimelineStart(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
                }}
                className="text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-md px-2.5 py-1.5 hover:bg-emerald-100"
              >
                {isEs ? 'Hoy' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(timelineStart);
                  next.setDate(timelineStart.getDate() + timelineSpan);
                  setTimelineStart(next);
                }}
                className="text-xs font-semibold text-slate-700 border border-gray-300 rounded-md px-2.5 py-1.5 hover:bg-slate-50"
              >
                {isEs ? 'Siguiente' : 'Next'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
                {[7, 12, 14].map((span) => (
                  <button
                    key={span}
                    type="button"
                    onClick={() => setTimelineSpan(span as TimelineSpan)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                      timelineSpan === span ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {span}d
                  </button>
                ))}
              </div>
              <p className="text-sm font-bold text-slate-900">{timelineRangeLabel}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[180px_1fr] border border-slate-200 rounded-t-lg bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <div className="px-3 py-2 border-r border-slate-200">{isEs ? 'Camion' : 'Truck'}</div>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(68px, 1fr))` }}
                >
                  {timelineDays.map((day) => (
                    <div key={day.key} className="px-2 py-2 text-center border-r last:border-r-0 border-slate-200">
                      {day.shortLabel}
                    </div>
                  ))}
                </div>
              </div>

              {timelineRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[180px_1fr] border-x border-b border-slate-200 last:rounded-b-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-r border-slate-200 bg-white text-xs font-semibold text-slate-700 truncate">
                    {row.label}
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(68px, 1fr))` }}>
                    {timelineDays.map((day) => {
                      const dayJobs = row.jobsByDay.get(day.key) || [];
                      return (
                        <div key={`${row.id}-${day.key}`} className="min-h-[78px] border-r last:border-r-0 border-slate-200 bg-white p-1.5">
                          <div className="space-y-1">
                            {dayJobs.slice(0, 2).map((job) => (
                              <button
                                key={job.id}
                                type="button"
                                onClick={() => openScheduleDetails(job)}
                                className={`w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-semibold transition ${
                                  job.status === 'completed'
                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    : row.isUnassigned
                                      ? 'border border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                                      : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                }`}
                                title={`${job.job_type} • ${job.properties?.street_address || ''}`}
                              >
                                {job.job_type}
                              </button>
                            ))}
                            {dayJobs.length > 2 ? (
                              <p className="text-[10px] font-semibold text-slate-500">+{dayJobs.length - 2}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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

              {teamMembers && teamMembers.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isEs ? 'Subcontratista Asignado' : 'Assigned Subcontractor'}
                  </label>
                  <select
                    value={editingSubcontractorId}
                    onChange={(event) => setEditingSubcontractorId(event.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                  >
                    <option value="">{isEs ? 'Sin subcontratista...' : 'No subcontractor...'}</option>
                    {teamMembers.map((member) => (
                      <option key={member.email} value={member.email}>
                        {`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isEs ? 'Pago a Subcontratista ($)' : 'Subcontractor Pay ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingSubcontractorPayAmount}
                  onChange={(event) => setEditingSubcontractorPayAmount(event.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingIsRecurring}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setEditingIsRecurring(checked);
                      if (!checked) {
                        setEditingAutoChargeEnabled(false);
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  {isEs ? 'Servicio recurrente' : 'Recurring service'}
                </label>

                {editingIsRecurring ? (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {isEs ? 'Frecuencia (dias)' : 'Frequency (days)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editingRecurrenceIntervalDays}
                        onChange={(event) => setEditingRecurrenceIntervalDays(event.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-slate-900"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={editingAutoChargeEnabled}
                        onChange={(event) => setEditingAutoChargeEnabled(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                      />
                      {isEs ? 'Pagos recurrentes (autocobro)' : 'Recurring payments (auto-charge)'}
                    </label>

                    <p className="text-[11px] text-slate-500">
                      {isEs
                        ? 'Al completar el trabajo, Prado creara el siguiente servicio recurrente y aplicara el autocobro si el cliente tiene autopago activo.'
                        : 'When this job is completed, Prado will create the next recurring service and apply auto-charge if customer autopay is active.'}
                    </p>
                  </>
                ) : null}
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