'use client';

import { useState, useMemo } from 'react';
import { createJob } from '@/app/actions';

// Extended Property interface to support customer matching
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

interface ScheduleJobFormProps {
  properties: Property[] | null;
  customers: Customer[] | null;
  services: Service[] | null;
  trucks: Truck[] | null;
}

export default function ScheduleJobForm({ properties, customers, services, trucks }: ScheduleJobFormProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // Automatically filter the properties array when the customer selection changes
  const filteredProperties = useMemo(() => {
    if (!selectedCustomerId || !properties) return [];
    return properties.filter((p) => p.customer_id === selectedCustomerId);
  }, [selectedCustomerId, properties]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCustomerId(e.target.value);
    setSelectedPropertyId(''); // Reset selected property when changing customer
  };

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Schedule Job</h3>
      
      <form 
        action={async (formData: FormData) => {
          // Explicitly append the correct propertyId to the form action run
          formData.set('propertyId', selectedPropertyId);
          const res = await createJob(formData);
          if (res?.success) {
            setSelectedCustomerId('');
            setSelectedPropertyId('');
            (document.getElementById('schedule-job-form') as HTMLFormElement)?.reset();
          }
        }} 
        id="schedule-job-form"
        className="space-y-3"
      >
        {/* 1. CUSTOMER SELECTION DROPDOWN */}
        <select 
          required 
          value={selectedCustomerId}
          onChange={handleCustomerChange}
          className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer text-gray-700"
        >
          <option value="">-- Select Customer --</option>
          {customers?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
            </option>
          ))}
        </select>

        {/* 2. TARGET SITE DROPDOWN (FILTERED BY SELECTED CUSTOMER) */}
        <select 
          name="propertyId" 
          required 
          value={selectedPropertyId}
          disabled={!selectedCustomerId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700"
        >
          <option value="">
            {!selectedCustomerId ? '-- Choose Customer First --' : '-- Select Target Site --'}
          </option>
          {filteredProperties.map((p) => (
            <option key={p.id} value={p.id}>{p.street_address}</option>
          ))}
        </select>

        {/* 3. DATE AND LOGISTICS INPUTS */}
        <input type="date" name="scheduledDate" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700" />

        <select
          name="jobType"
          required
          className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer text-gray-700"
        >
          <option value="">-- Select Service --</option>
          {services?.map((service) => (
            <option key={service.id} value={service.name}>
              {service.name}
            </option>
          ))}
        </select>

        <select
          name="truckId"
          className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer text-gray-700"
        >
          <option value="">-- Select Truck (Optional) --</option>
          {trucks?.map((truck) => (
            <option key={truck.id} value={truck.id}>
              {truck.name}{truck.plate_number ? ` • ${truck.plate_number}` : ''}
            </option>
          ))}
        </select>
        
        <input type="number" step="0.01" name="costAmount" placeholder="Price ($)" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700" />
        
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-sm cursor-pointer">
          Dispatch Job Target
        </button>
      </form>
    </section>
  );
}