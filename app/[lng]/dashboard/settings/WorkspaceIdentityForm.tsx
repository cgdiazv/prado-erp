'use client';

import { useId, useRef, useState } from 'react';
import { updateWorkspaceIdentity } from './actions';
import { getTranslations } from '@/lib/translations';
import { US_STATES } from '@/lib/usStates';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';

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
  showOwnerFields?: boolean;
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
  showOwnerFields = true,
}: WorkspaceIdentityFormProps) {
  const translations = getTranslations(locale);
  const isEs = locale.toLowerCase().startsWith('es');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'slogan' | 'logo' | 'phone' | 'streetAddress' | 'city' | 'state' | 'zipCode' | null>(null);
  const [slogan, setSlogan] = useState(initialSlogan);
  const [phone, setPhone] = useState(initialPhone);
  const [streetAddress, setStreetAddress] = useState(initialStreetAddress);
  const [city, setCity] = useState(initialCity);
  const [stateValue, setStateValue] = useState(initialState);
  const [zipCode, setZipCode] = useState(initialZipCode);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(initialLogoUrl);
  const [logoFileName, setLogoFileName] = useState('');
  const [removeLogoRequested, setRemoveLogoRequested] = useState(false);
  const logoInputId = useId();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedState = (() => {
    const value = initialState.trim();
    if (!value) return '';

    const byName = US_STATES.find((state) => state.name.toLowerCase() === value.toLowerCase());
    if (byName) return byName.name;

    const byCode = US_STATES.find((state) => state.code.toLowerCase() === value.toLowerCase());
    return byCode ? byCode.name : '';
  })();
  const stateDefaultValue = normalizedState || initialState.trim();

  function toggleField(field: typeof editingField) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingField((current) => (current === field ? null : field));
  }

  function renderFieldActions(field: Exclude<typeof editingField, null>) {
    const isEditing = editingField === field;

    return (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => toggleField(field)} className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          {isEditing ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
        </button>
        {isEditing ? (
          <button type="submit" disabled={loading} className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400">
            {loading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Actualizar' : 'Update')}
          </button>
        ) : null}
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(event.currentTarget);
    formData.set('slogan', slogan);
    formData.set('phone', phone);
    formData.set('streetAddress', streetAddress);
    formData.set('city', city);
    formData.set('state', stateValue);
    formData.set('zipCode', zipCode);
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

    setEditingField(null);
    setSuccessMsg(translations.dashboard.workspaceIdentityUpdatedSuccess);
  }

  function handleLogoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setLogoFileName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(objectUrl);
    setRemoveLogoRequested(false);
  }

  function handleRemoveLogo() {
    setLogoPreviewUrl('');
    setLogoFileName('');
    setRemoveLogoRequested(true);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  }

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.workspaceIdentity}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.workspaceIdentityDescription}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="mx-6 md:mx-8 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 md:mx-8 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-lg font-medium">
            {successMsg}
          </div>
        )}

        <div className="border-y border-slate-200">
          <div className="divide-y divide-slate-200">
            <div className="px-6 md:px-8 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.companyName}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{companyName || (isEs ? 'Sin nombre' : 'No company name')}</p>
                </div>
              </div>
            </div>

            <div className="px-6 md:px-8 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.systemAccountEmail}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{systemEmail || (isEs ? 'Sin correo' : 'No email')}</p>
                </div>
              </div>
            </div>

            {showOwnerFields ? (
              <>
                <div className="px-6 md:px-8 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Slogan / Short Description</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{slogan.trim() || (isEs ? 'No slogan' : 'No slogan')}</p>
                    </div>
                    {renderFieldActions('slogan')}
                  </div>
                  <div className={editingField === 'slogan' ? 'mt-3' : 'hidden'}>
                    <input
                      type="text"
                      name="slogan"
                      value={slogan}
                      onChange={(event) => setSlogan(event.target.value)}
                      placeholder="Ex: Premium Field Service Solutions"
                      maxLength={160}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">{isEs ? 'Se muestra en correos de estimaciones y facturas.' : 'Shown in estimate and invoice emails.'}</p>
                  </div>
                </div>

                <div className="px-6 md:px-8 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.organizationLogo}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{logoPreviewUrl ? (isEs ? 'Logo cargado' : 'Logo uploaded') : (isEs ? 'Sin logo' : 'No logo uploaded')}</p>
                    </div>
                    {renderFieldActions('logo')}
                  </div>
                  <input
                    id={logoInputId}
                    type="file"
                    name="logoFile"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    ref={logoInputRef}
                    className={editingField === 'logo' ? 'hidden' : 'hidden'}
                    onChange={handleLogoFileChange}
                  />
                  <div className={editingField === 'logo' ? 'mt-3 space-y-3' : 'hidden'}>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-2">
                      <label
                        htmlFor={logoInputId}
                        className="inline-flex cursor-pointer rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        {translations.dashboard.chooseFile}
                      </label>
                      <span className="text-xs text-gray-600 truncate">{logoFileName || translations.dashboard.noFileChosen}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{isEs ? 'Acepta: PNG, JPG, WEBP, SVG. Tamano maximo: 3MB.' : 'Accepted: PNG, JPG, WEBP, SVG. Max size: 3MB.'}</p>
                    {logoPreviewUrl ? (
                      <div className="flex items-center gap-3">
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
                          {isEs ? 'Eliminar logo' : 'Remove Logo'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="px-6 md:px-8 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.phone}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{phone.trim() || (isEs ? 'Sin teléfono' : 'No phone')}</p>
                    </div>
                    {renderFieldActions('phone')}
                  </div>
                  <div className={editingField === 'phone' ? 'mt-3' : 'hidden'}>
                    <input
                      type="tel"
                      name="phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder={translations.dashboard.workspacePhonePlaceholder}
                      maxLength={50}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    />
                  </div>
                </div>

                <div className="px-6 md:px-8 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.streetAddress}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{streetAddress.trim() || (isEs ? 'Sin dirección' : 'No street address')}</p>
                    </div>
                    {renderFieldActions('streetAddress')}
                  </div>
                  <div className={editingField === 'streetAddress' ? 'mt-3' : 'hidden'}>
                    <AddressAutocompleteInput
                      name="streetAddress"
                      value={streetAddress}
                      onChange={(event) => setStreetAddress(event.target.value)}
                      placeholder={translations.dashboard.workspaceAddressPlaceholder}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    />
                  </div>
                </div>

                <div className="px-6 md:px-8 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.city}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{city.trim() || (isEs ? 'Sin ciudad' : 'No city')}</p>
                    </div>
                    {renderFieldActions('city')}
                  </div>
                  <div className={editingField === 'city' ? 'mt-3' : 'hidden'}>
                    <input
                      type="text"
                      name="city"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder={translations.dashboard.city}
                      maxLength={120}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    />
                  </div>
                </div>

                <div className="px-6 md:px-8 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.state}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{(stateValue || stateDefaultValue).trim() || (isEs ? 'Sin estado' : 'No state')}</p>
                    </div>
                    {renderFieldActions('state')}
                  </div>
                  <div className={editingField === 'state' ? 'mt-3' : 'hidden'}>
                    <select
                      name="state"
                      value={stateValue}
                      onChange={(event) => setStateValue(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    >
                      <option value="">{isEs ? 'Selecciona estado' : 'Select state'}</option>
                      {initialState.trim() && !normalizedState && (
                        <option value={initialState.trim()}>{initialState.trim()}</option>
                      )}
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="px-6 md:px-8 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.zip}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{zipCode.trim() || (isEs ? 'Sin ZIP' : 'No ZIP')}</p>
                    </div>
                    {renderFieldActions('zipCode')}
                  </div>
                  <div className={editingField === 'zipCode' ? 'mt-3' : 'hidden'}>
                    <input
                      type="text"
                      name="zipCode"
                      value={zipCode}
                      onChange={(event) => setZipCode(event.target.value)}
                      placeholder={translations.dashboard.zip}
                      maxLength={20}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
