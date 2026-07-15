import { getTranslations } from '@/lib/translations';

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  vendor?: string | null;
  description?: string | null;
  amount: number;
}

interface ExpenseLedgerProps {
  expenses: Expense[] | null;
  locale?: string;
}

export default function ExpenseLedger({ expenses, locale = 'en' }: ExpenseLedgerProps) {
  const translations = getTranslations(locale);

  return (
    <>
      {expenses && expenses.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3">{translations.dashboard.expenseDate}</th>
                <th className="px-4 py-3">{translations.dashboard.category}</th>
                <th className="px-4 py-3">{translations.dashboard.vendor}</th>
                <th className="px-4 py-3">{translations.dashboard.description}</th>
                <th className="px-4 py-3 text-right">{translations.dashboard.amount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs">{exp.expense_date}</td>
                  <td className="px-4 py-3"><span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-medium">{exp.category}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{exp.vendor || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{exp.description || '—'}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-mono font-semibold">-${exp.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-sm italic">{translations.dashboard.noOperationalExpenses}</p>
      )}
    </>
  );
}
