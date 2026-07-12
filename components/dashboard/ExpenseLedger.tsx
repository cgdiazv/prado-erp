
interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description?: string | null;
  amount: number;
}

interface ExpenseLedgerProps {
  expenses: Expense[] | null;
}

export default function ExpenseLedger({ expenses }: ExpenseLedgerProps) {
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Tracked Expenses</h2>
      {expenses && expenses.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <tbody className="divide-y divide-gray-200 bg-white">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs">{exp.expense_date}</td>
                  <td className="px-4 py-3"><span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-xs font-medium">{exp.category}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{exp.description || '—'}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-mono font-semibold">-${exp.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-sm italic">No operational expenses reported.</p>
      )}
    </section>
  );
}
