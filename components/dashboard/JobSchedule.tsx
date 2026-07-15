'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DeleteJobButton from '@/components/DeleteJobButton';
import { completeJob, updateJobScheduleDetails } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

type FilterType = 'all' | 'scheduled' | 'completed';

interface JobScheduleProps {
  jobs: any[] | null;
  trucks: Array<{ id: string; name: string; plate_number?: string | null }>;
  locale?: string;
}

export default function JobSchedule({ jobs, trucks, locale = 'en' }: JobScheduleProps) {
  const router = useRouter();
  const translations = getTranslations(locale);
  const [filter, setFilter] = useState<FilterType>('all');
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
      ? jobs
      : jobs.filter((job) => job.status === filter)
    : [];

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'scheduled', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <>
      {/* Filter tabs */}
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

      {filteredJobs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3">{translations.dashboard.date}</th>
                <th className="px-4 py-3">{translations.dashboard.address}</th>
                <th className="px-4 py-3">{translations.dashboard.type}</th>
                <th className="px-4 py-3">{translations.dashboard.cost}</th>
                <th className="px-4 py-3 text-right">{translations.dashboard.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition duration-150">
                  <td className="px-4 py-3 font-medium text-gray-700">{job.scheduled_date}</td>
                  <td className="px-4 py-3 text-gray-500">{job.properties?.street_address || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{job.job_type}</td>
                  <td className="px-4 py-3 font-mono text-gray-900 font-medium">${job.cost_amount}</td>
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
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md border border-gray-200 shadow-xs select-none">
                          {translations.dashboard.completed}
                        </span>
                      )}

                      {/* CLIENT COMPONENT ISOLATION FOR DELETE INTERACTIVITY */}
                      <DeleteJobButton jobId={job.id} />
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