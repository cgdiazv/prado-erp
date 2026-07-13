import Link from 'next/link';
import DeleteJobButton from '@/components/DeleteJobButton';
import { completeJob } from '@/app/actions';
import { getTranslations } from '@/lib/translations';
import ScheduleJobModal from './ScheduleJobModal';

interface Property {
  id: string;
  street_address: string;
  customer_id: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
}

interface Service {
  id: string;
  name: string;
  base_price: number | null;
}

interface Truck {
  id: string;
  name: string;
  plate_number: string | null;
  is_active: boolean | null;
  status: string | null;
}

interface JobScheduleProps {
  jobs: any[] | null;
  properties: Property[] | null;
  customers: Customer[] | null;
  services: Service[] | null;
  trucks: Truck[] | null;
  isIndividualAccount?: boolean;
  locale?: string;
}

export default function JobSchedule({ jobs, properties, customers, services, trucks, isIndividualAccount = false, locale = 'en' }: JobScheduleProps) {
  const translations = getTranslations(locale);
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{translations.dashboard.liveJobSchedule}</h2>
        <ScheduleJobModal
          properties={properties}
          customers={customers}
          services={services}
          trucks={trucks}
          isIndividualAccount={isIndividualAccount}
          locale={locale}
        />
      </div>
      {jobs && jobs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{translations.dashboard.date}</th>
                <th className="px-4 py-3">{translations.dashboard.address}</th>
                <th className="px-4 py-3">{translations.dashboard.type}</th>
                <th className="px-4 py-3">{translations.dashboard.cost}</th>
                <th className="px-4 py-3 text-right">{translations.dashboard.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {jobs.map((job) => (
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
                        <form action={async () => {
                          'use server';
                          await completeJob(job.id);
                        }}>
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
    </section>
  );
}