'use client';

import { useState, useMemo } from 'react';
import { createJob } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

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

interface ScheduleJobModalProps {
  properties: Property[] | null;
  customers: Customer[] | null;
  services: Service[] | null;
  trucks: Truck[] | null;
  isIndividualAccount?: boolean;
  locale?: string;
}

export default function ScheduleJobModal({ properties, customers, services, trucks, isIndividualAccount = false, locale = 'en' }: ScheduleJobModalProps) {
  const translations = getTranslations(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const filteredProperties = useMemo(() => {
    if (!selectedCustomerId || !properties) return [];
    return properties.filter((p) => p.customer_id === selectedCustomerId);
  }, [selectedCustomerId, properties]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCustomerId(e.target.value);
    setSelectedPropertyId('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedCustomerId('');
    setSelectedPropertyId('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
      >
        + {translations.dashboard.scheduleJob}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{translations.dashboard.scheduleJob}</h3>
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
                  formData.set('propertyId', selectedPropertyId);
                  const res = await createJob(formData);
                  if (res?.success) {
                    handleClose();
                  }
                }}
                id="schedule-job-form"
                className="space-y-3"
              >
                <select
                  required
                  value={selectedCustomerId}
                  onChange={handleCustomerChange}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer text-gray-700"
                >
                  <option value="">{translations.dashboard.selectCustomer}</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                </select>

                <select
                  name="propertyId"
                  required
                  value={selectedPropertyId}
                  disabled={!selectedCustomerId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700"
                >
                  <option value="">
                    {!selectedCustomerId ? translations.dashboard.chooseCustomerFirst : translations.dashboard.selectTargetSite}
                  </option>
                  {filteredProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.street_address}</option>
                  ))}
                </select>

                <input
                  type="date"
                  name="scheduledDate"
                  required
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
                />

                <select
                  name="jobType"
                  required
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer text-gray-700"
                >
                  <option value="">{translations.dashboard.selectService}</option>
                  {services?.map((service) => (
                    <option key={service.id} value={service.name}>{service.name}</option>
                  ))}
                </select>

                {!isIndividualAccount && (
                  <select
                    name="truckId"
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer text-gray-700"
                  >
                    <option value="">{translations.dashboard.selectTruckOptional}</option>
                    {trucks?.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.name}{truck.plate_number ? ` • ${truck.plate_number}` : ''}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="number"
                  step="0.01"
                  name="costAmount"
                  placeholder={translations.dashboard.price}
                  required
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg transition shadow-sm"
                  >
                    {translations.dashboard.dispatchJobTarget}
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
