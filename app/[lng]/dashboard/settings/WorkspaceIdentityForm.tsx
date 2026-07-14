'use client';

import { useRef, useState } from 'react';
import { updateWorkspaceIdentity } from './actions';
import { getTranslations } from '@/lib/translations';

interface WorkspaceIdentityFormProps {
  companyName: string;
  systemEmail: string;
  initialLogoUrl?: string;
  initialSlogan?: string;
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
  initialLogoUrl = '',
  initialSlogan = '',
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
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(initialLogoUrl);
  const [removeLogoRequested, setRemoveLogoRequested] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(event.currentTarget);
    formData.set('locale', locale);
    formData.set('removeLogo', removeLogoRequested ? 'true' : 'false');

    const response = await updateWorkspaceIdentity(formData);

    setLoading(false);

    if (response?.error) {
      setErrorMsg(response.error);
      return;
    }

    if (response?.logoUrl) {
      setLogoPreviewUrl(response.logoUrl);
      setRemoveLogoRequested(false);
    }

    if (response?.logoUrl === null) {
      setLogoPreviewUrl('');
      setRemoveLogoRequested(false);
    }

    setSuccessMsg(translations.dashboard.workspaceIdentityUpdatedSuccess);
  }

  function handleLogoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(objectUrl);
    setRemoveLogoRequested(false);
  }

  function handleRemoveLogo() {
    setLogoPreviewUrl('');
    setRemoveLogoRequested(true);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
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
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Slogan / Short Description</label>
            <input
              type="text"
              name="slogan"
              defaultValue={initialSlogan}
              placeholder="Ex: Premium Field Service Solutions"
              maxLength={160}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
            />
            <p className="mt-1 text-[11px] text-slate-400">Shown in estimate and invoice emails.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Organization Logo</label>
            <input
              type="file"
              name="logoFile"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              ref={logoInputRef}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm bg-white outline-none file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
              onChange={handleLogoFileChange}
            />
            <p className="mt-1 text-[11px] text-slate-400">Accepted: PNG, JPG, WEBP, SVG. Max size: 3MB.</p>
            {logoPreviewUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={logoPreviewUrl}
                  alt="Organization logo preview"
                  className="h-14 w-14 rounded-lg border border-gray-200 bg-white object-contain p-1"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
                >
                  Remove Logo
                </button>
              </div>
            ) : null}
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
