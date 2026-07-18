'use client';

import { useState, useMemo } from 'react';
import { createJob } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

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
  is_recurring_default?: boolean | null;
  recurrence_interval_days?: number | null;
  auto_charge_default?: boolean | null;
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
  isIndividualAccount?: boolean;
  locale?: string;
}

export default function ScheduleJobForm({ properties, customers, services, trucks, isIndividualAccount = false, locale = 'en' }: ScheduleJobFormProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [costAmount, setCostAmount] = useState<string>('');
  const [useServiceDefaults, setUseServiceDefaults] = useState(true);
  const [overrideIsRecurring, setOverrideIsRecurring] = useState(false);
  const [overrideRecurrenceIntervalDays, setOverrideRecurrenceIntervalDays] = useState('30');
  const [overrideAutoChargeEnabled, setOverrideAutoChargeEnabled] = useState(false);

  const selectedService = useMemo(
    () => services?.find((service) => service.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const serviceDefaultIsRecurring = Boolean(selectedService?.is_recurring_default);
  const serviceDefaultIntervalDays = selectedService?.recurrence_interval_days ? String(selectedService.recurrence_interval_days) : '30';
  const serviceDefaultAutoCharge = Boolean(selectedService?.auto_charge_default);

  const effectiveIsRecurring = useServiceDefaults ? serviceDefaultIsRecurring : overrideIsRecurring;
  const effectiveRecurrenceIntervalDays = effectiveIsRecurring
    ? (useServiceDefaults ? serviceDefaultIntervalDays : overrideRecurrenceIntervalDays)
    : '';
  const effectiveAutoChargeEnabled = effectiveIsRecurring
    ? (useServiceDefaults ? serviceDefaultAutoCharge : overrideAutoChargeEnabled)
    : false;

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
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{translations.dashboard.scheduleJob}</h3>
      
      <form 
        action={async (formData: FormData) => {
          // Explicitly append the correct propertyId to the form action run
          formData.set('propertyId', selectedPropertyId);
          const res = await createJob(formData);
          if (res?.success) {
            setSelectedCustomerId('');
            setSelectedPropertyId('');
            setSelectedServiceId('');
            setCostAmount('');
            setUseServiceDefaults(true);
            setOverrideIsRecurring(false);
            setOverrideRecurrenceIntervalDays('30');
            setOverrideAutoChargeEnabled(false);
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
          <option value="">{translations.dashboard.selectCustomer}</option>
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
            {!selectedCustomerId ? translations.dashboard.chooseCustomerFirst : translations.dashboard.selectTargetSite}
          </option>
          {filteredProperties.map((p) => (
            <option key={p.id} value={p.id}>{p.street_address}</option>
          ))}
        </select>

        {/* 3. DATE AND LOGISTICS INPUTS */}
        <input type="date" name="scheduledDate" required className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700" />

        <select
          name="serviceId"
          required
          value={selectedServiceId}
          onChange={(event) => {
            const nextServiceId = event.target.value;
            setSelectedServiceId(nextServiceId);
            const nextService = services?.find((service) => service.id === nextServiceId) || null;
            setCostAmount(nextService?.base_price != null ? Number(nextService.base_price).toFixed(2) : '');
            setUseServiceDefaults(true);
            setOverrideIsRecurring(Boolean(nextService?.is_recurring_default));
            setOverrideRecurrenceIntervalDays(nextService?.recurrence_interval_days ? String(nextService.recurrence_interval_days) : '30');
            setOverrideAutoChargeEnabled(Boolean(nextService?.auto_charge_default));
          }}
          className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none cursor-pointer text-gray-700"
        >
          <option value="">{translations.dashboard.selectService}</option>
          {services?.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>

        {selectedService ? (
          <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={useServiceDefaults}
                onChange={(event) => setUseServiceDefaults(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
              />
              {isEs ? 'Usar configuracion por defecto del servicio' : 'Use service default settings'}
            </label>

            {!useServiceDefaults ? (
              <>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={overrideIsRecurring}
                    onChange={(event) => setOverrideIsRecurring(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  {isEs ? 'Trabajo recurrente' : 'Recurring job'}
                </label>

                {overrideIsRecurring ? (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {isEs ? 'Frecuencia (dias)' : 'Frequency (days)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={overrideRecurrenceIntervalDays}
                        onChange={(event) => setOverrideRecurrenceIntervalDays(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={overrideAutoChargeEnabled}
                        onChange={(event) => setOverrideAutoChargeEnabled(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                      />
                      {isEs ? 'Auto cobro despues del primer pago' : 'Auto-charge after first payment'}
                    </label>
                  </>
                ) : null}
              </>
            ) : (
              <p className="text-[11px] text-slate-500">
                {serviceDefaultIsRecurring
                  ? `${isEs ? 'Este servicio se programara cada' : 'This service will recur every'} ${serviceDefaultIntervalDays} ${isEs ? 'dias' : 'days'}${serviceDefaultAutoCharge ? ` • ${isEs ? 'Auto cobro activado' : 'Auto-charge enabled'}` : ''}`
                  : isEs
                    ? 'Este servicio no es recurrente por defecto.'
                    : 'This service is non-recurring by default.'}
              </p>
            )}

            {effectiveIsRecurring ? (
              <p className="text-[11px] text-slate-500">
                {isEs
                  ? 'El siguiente trabajo se crea automaticamente al completar el trabajo actual.'
                  : 'The next job is created automatically when the current job is completed.'}
              </p>
            ) : null}
          </div>
        ) : null}

        <input type="hidden" name="jobType" value={selectedService?.name || ''} />
        <input type="hidden" name="isRecurring" value={effectiveIsRecurring ? 'true' : 'false'} />
        <input type="hidden" name="recurrenceIntervalDays" value={effectiveRecurrenceIntervalDays} />
        <input type="hidden" name="autoChargeEnabled" value={effectiveAutoChargeEnabled ? 'true' : 'false'} />

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
          value={costAmount}
          onChange={(event) => setCostAmount(event.target.value)}
          placeholder={translations.dashboard.price}
          required
          className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none text-gray-700"
        />
        
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded-lg transition shadow-sm cursor-pointer">
          {translations.dashboard.dispatchJobTarget}
        </button>
      </form>
    </section>
  );
}