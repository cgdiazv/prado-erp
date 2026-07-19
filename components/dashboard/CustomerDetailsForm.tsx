'use client';

import { useState } from 'react';
import { updateCustomer } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

interface CustomerDetailsFormProps {
  customerId: string;
  locale?: string;
  initialFirstName: string;
  initialLastName: string;
  initialCompanyName?: string | null;
  initialEmail?: string | null;
  initialPhone?: string | null;
  initialBillingAddress?: string | null;
}

export default function CustomerDetailsForm({
  customerId,
  locale = 'en',
  initialFirstName,
  initialLastName,
  initialCompanyName = '',
  initialEmail = '',
  initialPhone = '',
  initialBillingAddress = '',
}: CustomerDetailsFormProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [companyName, setCompanyName] = useState(initialCompanyName || '');
  const [email, setEmail] = useState(initialEmail || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [billingAddress, setBillingAddress] = useState(initialBillingAddress || '');

  const withoutOptional = (label: string) => label.replace(/\s*\((?:optional|opcional)\)\s*/gi, '').trim();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.set('firstName', firstName);
    formData.set('lastName', lastName);
    formData.set('companyName', companyName);
    formData.set('email', email);
    formData.set('phone', phone);
    formData.set('billingAddress', billingAddress);

    const result = await updateCustomer(customerId, formData);
    setLoading(false);

    if (result?.error) {
      setErrorMsg(result.error);
      return;
    }

    setEditing(false);
    setSuccessMsg(isEs ? 'Perfil del cliente actualizado.' : 'Client profile updated.');
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="pt-6 md:pt-8 space-y-6">
        <div className="px-6 md:px-8">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-0.5">{translations.dashboard.editClientDetails}</h2>
          <p className="text-[11px] text-slate-400 font-medium">{translations.dashboard.editClientDescription}</p>
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
                  <p className="text-sm font-medium text-slate-700">{firstName} {lastName}</p>
                  <p className="mt-1 text-xs text-slate-500">{companyName.trim() || (isEs ? 'Sin empresa' : 'No company')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setEditing((current) => !current);
                    }}
                    className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {editing ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                  </button>
                  {editing ? (
                    <button
                      type="submit"
                      disabled={loading}
                      className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                    >
                      {loading ? (isEs ? 'Actualizando...' : 'Updating...') : (isEs ? 'Actualizar' : 'Update')}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={editing ? 'mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5' : 'hidden'}>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.firstName}</label>
                  <input
                    type="text"
                    name="firstName"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.lastName}</label>
                  <input
                    type="text"
                    name="lastName"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{withoutOptional(translations.dashboard.companyOptional)}</label>
                  <input
                    type="text"
                    name="companyName"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.emailAddress}</label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{withoutOptional(translations.dashboard.phoneNumber)}</label>
                  <input
                    type="text"
                    name="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{translations.dashboard.billingAddress}</label>
                  <input
                    type="text"
                    name="billingAddress"
                    value={billingAddress}
                    onChange={(event) => setBillingAddress(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}