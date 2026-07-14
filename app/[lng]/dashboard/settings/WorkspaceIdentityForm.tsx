'use client';

import { useState } from 'react';
import { updateWorkspaceIdentity } from './actions';
import { getTranslations } from '@/lib/translations';

interface WorkspaceIdentityFormProps {
  companyName: string;
  systemEmail: string;
  initialPhone?: string;
  initialStreetAddress?: string;
  initialCity?: string;
  initialState?: string;
  initialZipCode?: string;
  locale?: string;
}

export default function WorkspaceIdentityForm({
  companyName,
  systemEmail,
  initialPhone = '',
  initialStreetAddress = '',
  initialCity = '',
  initialState = '',
  initialZipCode = '',
  locale = 'en',
}: WorkspaceIdentityFormProps) {
  const translations = getTranslations(locale);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(event.currentTarget);
    formData.set('locale', locale);

    const response = await updateWorkspaceIdentity(formData);

    setLoading(false);

    if (response?.error) {
      setErrorMsg(response.error);
      return;
    }

    setSuccessMsg(translations.dashboard.workspaceIdentityUpdatedSuccess);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.workspaceIdentity}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.workspaceIdentityDescription}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-lg font-medium">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.companyName}</label>
            <input
              type="text"
              defaultValue={companyName}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-slate-50 p-2.5 text-sm text-gray-500 cursor-not-allowed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.systemAccountEmail}</label>
            <input
              type="email"
              defaultValue={systemEmail}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-slate-50 p-2.5 text-sm text-gray-500 cursor-not-allowed outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.phone}</label>
            <input
              type="tel"
              name="phone"
              defaultValue={initialPhone}
              placeholder={translations.dashboard.workspacePhonePlaceholder}
              maxLength={50}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.streetAddress}</label>
            <input
              type="text"
              name="streetAddress"
              defaultValue={initialStreetAddress}
              placeholder={translations.dashboard.workspaceAddressPlaceholder}
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.city}</label>
            <input
              type="text"
              name="city"
              defaultValue={initialCity}
              placeholder={translations.dashboard.city}
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.state}</label>
            <input
              type="text"
              name="state"
              defaultValue={initialState}
              placeholder={translations.dashboard.state}
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.zip}</label>
            <input
              type="text"
              name="zipCode"
              defaultValue={initialZipCode}
              placeholder={translations.dashboard.zip}
              maxLength={20}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? translations.dashboard.workspaceIdentitySaving : translations.dashboard.workspaceIdentitySave}
        </button>
      </form>
    </div>
  );
}
