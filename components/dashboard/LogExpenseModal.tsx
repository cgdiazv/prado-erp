'use client';

import { useState } from 'react';
import { createExpense } from '@/app/actions';
import ExpenseCategorySelect from '@/components/dashboard/ExpenseCategorySelect';
import { getTranslations } from '@/lib/translations';

interface LogExpenseModalProps {
  locale?: string;
  jobs?: Array<{
    id: string;
    job_type: string;
    scheduled_date?: string | null;
    properties?: { street_address?: string | null } | null;
  }>;
}

export default function LogExpenseModal({ locale = 'en', jobs = [] }: LogExpenseModalProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
      >
        + {translations.dashboard.logExpense}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{translations.dashboard.logExpense}</h3>
              <button
                onClick={handleClose}
                className="cursor-pointer text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <form
                action={async (formData: FormData) => {
                  await (createExpense as (formData: FormData) => void)(formData);
                  handleClose();
                }}
                className="space-y-3"
              >
                <input
                  type="date"
                  name="expenseDate"
                  required
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
                />
                <select
                  name="jobId"
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none text-gray-700"
                  defaultValue=""
                >
                  <option value="">{isEs ? 'Sin job asignado (opcional)' : 'No job assigned (optional)'}</option>
                  {jobs.map((job) => {
                    const dateLabel = job.scheduled_date
                      ? new Date(job.scheduled_date).toLocaleDateString(isEs ? 'es-ES' : 'en-US')
                      : isEs
                        ? 'Sin fecha'
                        : 'No date';
                    const address = job.properties?.street_address?.trim() || (isEs ? 'Sin direccion' : 'No address');

                    return (
                      <option key={job.id} value={job.id}>
                        {`${job.job_type} | ${dateLabel} | ${address}`}
                      </option>
                    );
                  })}
                </select>
                <ExpenseCategorySelect
                  name="category"
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none text-gray-700"
                />
                <input
                  type="text"
                  name="vendor"
                  placeholder={translations.dashboard.vendorPlaceholder}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
                />
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  placeholder={translations.dashboard.amountPlaceholder}
                  required
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  rows={2}
                  required
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700 resize-none"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg transition shadow-sm"
                  >
                    {translations.dashboard.saveExpenseEntry}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs py-2 rounded-lg transition shadow-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
