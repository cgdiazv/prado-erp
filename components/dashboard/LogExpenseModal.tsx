'use client';

import { useState } from 'react';
import { createExpense } from '@/app/actions';
import ExpenseCategorySelect from '@/components/dashboard/ExpenseCategorySelect';
import { getTranslations } from '@/lib/translations';

interface LogExpenseModalProps {
  locale?: string;
}

export default function LogExpenseModal({ locale = 'en' }: LogExpenseModalProps) {
  const translations = getTranslations(locale);
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
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
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
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
                <ExpenseCategorySelect
                  name="category"
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none text-gray-700"
                />
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  placeholder={translations.dashboard.amountPlaceholder}
                  required
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg transition shadow-sm"
                  >
                    {translations.dashboard.saveExpenseEntry}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs py-2 rounded-lg transition shadow-sm font-semibold"
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
