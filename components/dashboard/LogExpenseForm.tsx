'use client';

import { createExpense } from '@/app/actions';
import ExpenseCategorySelect from '@/components/dashboard/ExpenseCategorySelect';
import { getTranslations } from '@/lib/translations';

interface LogExpenseFormProps {
  locale?: string;
}

export default function LogExpenseForm({ locale = 'en' }: LogExpenseFormProps) {
  const translations = getTranslations(locale);

  return (
    <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{translations.dashboard.logExpense}</h3>
      <form action={createExpense as (formData: FormData) => void} className="space-y-3">
        <input type="date" name="expenseDate" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
        <ExpenseCategorySelect
          name="category"
          className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none"
        />
        <input
          type="text"
          name="vendor"
          placeholder={translations.dashboard.vendorPlaceholder}
          className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none"
        />
        <input type="number" step="0.01" name="amount" placeholder={translations.dashboard.amountPlaceholder} required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
        <textarea name="description" placeholder="Description" rows={2} required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none resize-none" />
        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-sm">
          {translations.dashboard.saveExpenseEntry}
        </button>
      </form>
    </section>
  );
}
