
import Link from 'next/link';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
}

interface CustomersProps {
  customers: Customer[] | null;
}

export default function Customers({ customers }: CustomersProps) {
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Active Customers</h2>
      {customers && customers.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <tbody className="divide-y divide-gray-200 bg-white">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                    <Link href={`/dashboard/customers/${customer.id}`}>{customer.first_name} {customer.last_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{customer.company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No customers linked to this workspace.</p>
      )}
    </section>
  );
}
