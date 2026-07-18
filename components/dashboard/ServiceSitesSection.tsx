'use client';

import { useState } from 'react';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';
import DeleteSiteButton from '@/components/DeleteSiteButton';
import { createProperty } from '@/app/actions';
import { getTranslations } from '@/lib/translations';
import { US_STATES } from '@/lib/usStates';

interface Property {
  id: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  service_notes?: string | null;
}

interface ServiceSitesSectionProps {
  customerId: string;
  locale?: string;
  properties: Property[];
}

export default function ServiceSitesSection({ customerId, locale = 'en', properties }: ServiceSitesSectionProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [editingCreate, setEditingCreate] = useState(false);
  const [editingSaved, setEditingSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await createProperty(customerId, formData);

    setLoading(false);

    if (result?.error) {
      setErrorMsg(result.error);
      return;
    }

    form.reset();
    setEditingCreate(false);
    setSuccessMsg(isEs ? 'Sitio de servicio vinculado.' : 'Service site linked.');
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="pt-6 md:pt-8 space-y-6">
        <div className="px-6 md:px-8">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">{translations.dashboard.serviceSites}</h2>
          <p className="text-[11px] text-slate-400 font-medium">{translations.dashboard.linkDispatchVectors}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg ? (
            <div className="mx-6 md:mx-8 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">{errorMsg}</div>
          ) : null}

          {successMsg ? (
            <div className="mx-6 md:mx-8 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">{successMsg}</div>
          ) : null}

          <div className="border-y border-slate-200">
            <div className="px-6 md:px-8 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.addNewLocation}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{isEs ? 'Vincula un nuevo sitio de servicio.' : 'Link a new service site.'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setEditingCreate((current) => !current);
                    }}
                    className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {editingCreate ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                  </button>
                  {editingCreate ? (
                    <button
                      type="submit"
                      disabled={loading}
                      className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                    >
                      {loading ? (isEs ? 'Vinculando...' : 'Linking...') : (isEs ? 'Vincular' : 'Link')}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={editingCreate ? 'mt-3 p-4 bg-slate-50 rounded-lg border border-gray-200 space-y-3' : 'hidden'}>
                <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">{translations.dashboard.addNewLocation}</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <AddressAutocompleteInput
                    name="streetAddress"
                    placeholder={translations.dashboard.streetAddress}
                    required
                    className="md:col-span-2 rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                  />
                  <input
                    type="text"
                    name="city"
                    placeholder={translations.dashboard.city}
                    required
                    className="rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      name="state"
                      required
                      defaultValue=""
                      className="rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                    >
                      <option value="">{isEs ? 'Selecciona estado' : 'Select state'}</option>
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="zipCode"
                      placeholder={translations.dashboard.zip}
                      required
                      className="rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  name="serviceNotes"
                  placeholder={translations.dashboard.gateCodesLabel}
                  className="w-full rounded-md border border-gray-300 p-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                />
              </div>
            </div>

            <div className="px-6 md:px-8 py-4 border-t border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {properties.length > 0
                      ? `${properties.length} ${properties.length === 1 ? (isEs ? 'sitio guardado' : 'saved site') : (isEs ? 'sitios guardados' : 'saved sites')}`
                      : (isEs ? 'No hay sitios guardados' : 'No saved sites')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {properties[0]?.street_address || translations.dashboard.noPropertiesRegistered}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSaved((current) => !current);
                    }}
                    className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {editingSaved ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                  </button>
                </div>
              </div>

              <div className={editingSaved ? 'mt-3' : 'hidden'}>
                {properties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {properties.map((prop) => (
                      <div key={prop.id} className="p-3 bg-slate-50 rounded-lg border border-gray-200/60 text-xs relative group">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DeleteSiteButton propertyId={prop.id} customerId={customerId} />
                        </div>
                        <p className="font-semibold text-slate-800 pr-6">{prop.street_address}</p>
                        <p className="text-slate-400 mt-0.5">{prop.city}, {prop.state} {prop.zip_code}</p>
                        {prop.service_notes ? (
                          <div className="mt-2 text-[11px] bg-amber-50/60 text-amber-900 p-2 rounded border border-amber-200/60 font-medium">
                            <strong>Notes:</strong> {prop.service_notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic text-center">{translations.dashboard.noPropertiesRegistered}</p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}