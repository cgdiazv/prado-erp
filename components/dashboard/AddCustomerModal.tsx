'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import AddressAutocompleteInput, { ResolvedAddress } from '@/components/AddressAutocompleteInput';
import { createCustomer } from '@/app/actions';
import { getTranslations } from '@/lib/translations';
import { US_STATES } from '@/lib/usStates';

interface AddCustomerModalProps {
  organizationId: string;
  locale?: string;
}

const resolveStateName = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';

  const byCode = US_STATES.find((entry) => entry.code.toLowerCase() === normalized);
  if (byCode) return byCode.name;

  const byName = US_STATES.find((entry) => entry.name.toLowerCase() === normalized);
  return byName?.name || value;
};

export default function AddCustomerModal({ organizationId, locale = 'en' }: AddCustomerModalProps) {
  const router = useRouter();
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    billingAddress: '',
    billingStreet: '',
    billingCity: '',
    billingState: '',
    billingZipCode: '',
    billingLatitude: null as number | null,
    billingLongitude: null as number | null,
    sameAsBilling: false,
    jobSiteStreetAddress: '',
    jobSiteCity: '',
    jobSiteState: '',
    jobSiteZipCode: '',
    jobSiteNotes: '',
    jobSiteLatitude: null as number | null,
    jobSiteLongitude: null as number | null,
  });

  const resetForm = () => {
    setErrorMsg(null);
    setFormData({
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      phone: '',
      billingAddress: '',
      billingStreet: '',
      billingCity: '',
      billingState: '',
      billingZipCode: '',
      billingLatitude: null,
      billingLongitude: null,
      sameAsBilling: false,
      jobSiteStreetAddress: '',
      jobSiteCity: '',
      jobSiteState: '',
      jobSiteZipCode: '',
      jobSiteNotes: '',
      jobSiteLatitude: null,
      jobSiteLongitude: null,
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    resetForm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBillingAddressResolved = (resolved: ResolvedAddress) => {
    const stateName = resolved.state ? resolveStateName(resolved.state) : '';
    const formatted =
      resolved.formattedAddress ||
      [resolved.streetAddress, resolved.city, [stateName, resolved.zipCode].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ');

    setFormData((prev) => ({
      ...prev,
      billingAddress: formatted,
      billingStreet: resolved.streetAddress || formatted,
      billingCity: resolved.city || '',
      billingState: stateName,
      billingZipCode: resolved.zipCode || '',
      billingLatitude: typeof resolved.latitude === 'number' ? resolved.latitude : null,
      billingLongitude: typeof resolved.longitude === 'number' ? resolved.longitude : null,
    }));
  };

  const handleJobSiteResolved = (resolved: ResolvedAddress) => {
    const stateName = resolved.state ? resolveStateName(resolved.state) : '';
    setFormData((prev) => ({
      ...prev,
      jobSiteStreetAddress: resolved.streetAddress || prev.jobSiteStreetAddress,
      jobSiteCity: resolved.city || prev.jobSiteCity,
      jobSiteState: stateName || prev.jobSiteState,
      jobSiteZipCode: resolved.zipCode || prev.jobSiteZipCode,
      jobSiteLatitude: typeof resolved.latitude === 'number' ? resolved.latitude : prev.jobSiteLatitude,
      jobSiteLongitude: typeof resolved.longitude === 'number' ? resolved.longitude : prev.jobSiteLongitude,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('organizationId', organizationId);
      formDataObj.append('firstName', formData.firstName);
      formDataObj.append('lastName', formData.lastName);
      formDataObj.append('companyName', formData.companyName);
      formDataObj.append('email', formData.email);
      formDataObj.append('phone', formData.phone);
      formDataObj.append('billingAddress', formData.billingAddress);
      formDataObj.append('sameAsBilling', String(formData.sameAsBilling));

      if (formData.sameAsBilling) {
        formDataObj.append('jobSiteStreetAddress', formData.billingStreet || formData.billingAddress);
        formDataObj.append('jobSiteCity', formData.billingCity);
        formDataObj.append('jobSiteState', formData.billingState);
        formDataObj.append('jobSiteZipCode', formData.billingZipCode);
        formDataObj.append('jobSiteNotes', formData.jobSiteNotes);
        if (formData.billingLatitude !== null) {
          formDataObj.append('jobSiteLatitude', String(formData.billingLatitude));
        }
        if (formData.billingLongitude !== null) {
          formDataObj.append('jobSiteLongitude', String(formData.billingLongitude));
        }
      } else {
        formDataObj.append('jobSiteStreetAddress', formData.jobSiteStreetAddress);
        formDataObj.append('jobSiteCity', formData.jobSiteCity);
        formDataObj.append('jobSiteState', formData.jobSiteState);
        formDataObj.append('jobSiteZipCode', formData.jobSiteZipCode);
        formDataObj.append('jobSiteNotes', formData.jobSiteNotes);
        if (formData.jobSiteLatitude !== null) {
          formDataObj.append('jobSiteLatitude', String(formData.jobSiteLatitude));
        }
        if (formData.jobSiteLongitude !== null) {
          formDataObj.append('jobSiteLongitude', String(formData.jobSiteLongitude));
        }
      }

      const result = await createCustomer(formDataObj);
      if (result?.error) {
        setErrorMsg(result.error);
        return;
      }

      resetForm();
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to create customer:', error);
      setErrorMsg(isEs ? 'No se pudo crear el cliente.' : 'Failed to create customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white transition';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
      >
        + {translations.dashboard.addNewCustomer}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-customer-modal-title"
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h3 id="create-customer-modal-title" className="text-base font-bold text-slate-900 tracking-tight">
                  {isEs ? 'Crear Nuevo Cliente' : 'Create New Customer'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEs
                    ? 'Registra un nuevo cliente junto con su dirección de facturación y sitio de trabajo.'
                    : 'Add a customer profile along with their billing and job site addresses.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label={isEs ? 'Cerrar' : 'Close'}
                className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Customer Details Section */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isEs ? 'Información del Cliente' : 'Customer Information'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    name="firstName"
                    placeholder={`${translations.dashboard.firstName} *`}
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className={inputClassName}
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder={`${translations.dashboard.lastName} *`}
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className={inputClassName}
                  />
                </div>

                <input
                  type="text"
                  name="companyName"
                  placeholder={translations.dashboard.companyOptional || translations.dashboard.companyName}
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={inputClassName}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    name="email"
                    placeholder={translations.dashboard.customerEmail}
                    value={formData.email}
                    onChange={handleInputChange}
                    className={inputClassName}
                  />

                  <input
                    type="tel"
                    name="phone"
                    placeholder={translations.dashboard.phoneNumber}
                    value={formData.phone}
                    onChange={(event) => {
                      setFormData((prev) => ({
                        ...prev,
                        phone: event.target.value.replace(/\D/g, ''),
                      }));
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={inputClassName}
                  />
                </div>
              </div>

              {/* Billing Address Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isEs ? 'Dirección de Facturación' : 'Billing Address'}
                </label>
                <AddressAutocompleteInput
                  name="billingAddress"
                  value={formData.billingAddress}
                  onChange={(event) => {
                    const nextVal = event.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      billingAddress: nextVal,
                      billingStreet: '',
                      billingCity: '',
                      billingState: '',
                      billingZipCode: '',
                      billingLatitude: null,
                      billingLongitude: null,
                    }));
                  }}
                  onAddressResolved={handleBillingAddressResolved}
                  placeholder={
                    isEs
                      ? 'Calle, ciudad, estado y código postal (Opcional)'
                      : 'Street, city, state, and zip code (Optional)'
                  }
                  className={inputClassName}
                />
              </div>

              {/* Job Site Address Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {isEs ? 'Dirección del Sitio de Trabajo' : 'Job Site Address'}
                  </span>

                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.sameAsBilling}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          sameAsBilling: event.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>{isEs ? 'Igual que facturación' : 'Same as billing address'}</span>
                  </label>
                </div>

                {formData.sameAsBilling ? (
                  <div className="space-y-2.5">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {formData.billingAddress.trim()
                        ? formData.billingAddress
                        : isEs
                        ? 'Ingresa una dirección de facturación arriba para usarla como sitio de trabajo.'
                        : 'Enter a billing address above to use it as the job site address.'}
                    </div>
                    <input
                      type="text"
                      name="jobSiteNotes"
                      placeholder={translations.dashboard.gateCodesLabel}
                      value={formData.jobSiteNotes}
                      onChange={handleInputChange}
                      className={inputClassName}
                    />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <AddressAutocompleteInput
                      name="jobSiteStreetAddress"
                      value={formData.jobSiteStreetAddress}
                      onChange={(event) => {
                        const nextVal = event.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          jobSiteStreetAddress: nextVal,
                          jobSiteLatitude: null,
                          jobSiteLongitude: null,
                        }));
                      }}
                      onAddressResolved={handleJobSiteResolved}
                      placeholder={
                        isEs ? 'Dirección de calle (Opcional)' : `${translations.dashboard.streetAddress} (Optional)`
                      }
                      className={inputClassName}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        name="jobSiteCity"
                        placeholder={translations.dashboard.city}
                        value={formData.jobSiteCity}
                        onChange={handleInputChange}
                        className={inputClassName}
                      />

                      <select
                        name="jobSiteState"
                        value={formData.jobSiteState}
                        onChange={handleInputChange}
                        className={inputClassName}
                      >
                        <option value="">{isEs ? 'Estado' : translations.dashboard.state}</option>
                        {US_STATES.map((state) => (
                          <option key={state.code} value={state.name}>
                            {state.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        name="jobSiteZipCode"
                        placeholder={translations.dashboard.zip}
                        value={formData.jobSiteZipCode}
                        onChange={handleInputChange}
                        className={inputClassName}
                      />
                    </div>

                    <input
                      type="text"
                      name="jobSiteNotes"
                      placeholder={translations.dashboard.gateCodesLabel}
                      value={formData.jobSiteNotes}
                      onChange={handleInputChange}
                      className={inputClassName}
                    />
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs py-2.5 rounded-lg transition shadow-sm font-semibold"
                >
                  {isSubmitting
                    ? isEs
                      ? 'Creando...'
                      : 'Creating...'
                    : isEs
                    ? 'Crear Cliente'
                    : 'Create Customer'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="cursor-pointer px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2.5 rounded-lg transition font-semibold"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
