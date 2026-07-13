
import Link from 'next/link';
import { getTranslations } from '@/lib/translations';
import AddCustomerModal from './AddCustomerModal';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface CustomersProps {
  customers: Customer[] | null;
  organizationId: string;
  locale?: string;
}

export default function Customers({ customers, organizationId, locale = 'en' }: CustomersProps) {
  const translations = getTranslations(locale);
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{translations.dashboard.activeCustomers}</h2>
        <AddCustomerModal organizationId={organizationId} locale={locale} />
      </div>
      {customers && customers.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{translations.dashboard.companyName}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{translations.dashboard.customerEmail}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{translations.dashboard.phoneNumber}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                    <Link href={`/dashboard/customers/${customer.id}`}>{customer.first_name} {customer.last_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{customer.company_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">{translations.dashboard.noCustomers}</p>
      )}
    </section>
  );
}
