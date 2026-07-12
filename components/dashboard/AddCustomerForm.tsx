import { createCustomer } from '@/app/actions';

interface AddCustomerFormProps {
  organizationId: string;
}

export default function AddCustomerForm({ organizationId }: AddCustomerFormProps) {
  return (
    <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-1 text-gray-800">Add New Customer</h3>
      <p className="text-xs text-gray-400 mb-3">Onboard a client account into this workspace profile.</p>

      <form action={createCustomer as (formData: FormData) => void} className="space-y-3">
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            required
            className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            required
            className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
        </div>

        <input
          type="text"
          name="companyName"
          placeholder="Company Name (Optional)"
          className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
        />

        <input
          type="email"
          name="email"
          placeholder="Customer Email Address"
          className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
        />

        {/* NEW PHONE FIELD */}
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number (Optional)"
          className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
        />

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 rounded-lg transition shadow-sm font-semibold"
        >
          Register Client Profile
        </button>
      </form>
    </section>
  );
}