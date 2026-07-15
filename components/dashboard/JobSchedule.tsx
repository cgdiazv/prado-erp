'use client';

import { useState } from 'react';
import DeleteJobButton from '@/components/DeleteJobButton';
import { completeJob } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

type FilterType = 'all' | 'scheduled' | 'completed';

interface JobScheduleProps {
  jobs: any[] | null;
  locale?: string;
}

export default function JobSchedule({ jobs, locale = 'en' }: JobScheduleProps) {
  const translations = getTranslations(locale);
  const [filter, setFilter] = useState<FilterType>('all');

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
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold">
                      {job.job_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900 font-medium">${job.cost_amount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* MARK DONE ICON TRIGGER */}
                      {job.status === 'scheduled' ? (
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
    </>
  );
}