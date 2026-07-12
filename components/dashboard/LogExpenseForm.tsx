
import { createExpense } from '@/app/actions';

export default function LogExpenseForm() {
  return (
    <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Log Expense</h3>
      <form action={createExpense as (formData: FormData) => void} className="space-y-3">
        <input type="date" name="expenseDate" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
        <select name="category" required className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none">
          <option value="Fuel">Fuel</option>
          <option value="Equipment Maintenance">Equipment Maintenance</option>
        </select>
        <input type="number" step="0.01" name="amount" placeholder="Amount ($)" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none" />
        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-sm">
          Save Expense Entry
        </button>
      </form>
    </section>
  );
}
