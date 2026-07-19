'use client';

import { useState } from 'react';
import { signOutOtherActiveDevices, updatePassword } from './actions';
import { getTranslations } from '@/lib/translations';

interface PasswordFormProps {
  locale?: string;
  activeRememberedSessions?: number;
}

export default function PasswordForm({ locale = 'en', activeRememberedSessions = 0 }: PasswordFormProps) {
  const translations = getTranslations(locale);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const isEs = locale.toLowerCase().startsWith('es');

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(event.currentTarget);
    const res = await updatePassword(formData);

    setLoading(false);
    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.requiresReauth) {
      window.location.href = `/${locale}/login?reauth=true`;
    } else {
      setSuccessMsg(translations.dashboard.passwordUpdatedSuccess);
      event.currentTarget.reset();
      setPassword('');
      setConfirmPassword('');
      setEditingPassword(false);
    }
  }

  async function handleSignOutOtherDevices() {
    setSessionLoading(true);
    setSessionError(null);
    setSessionMessage(null);

    const payload = new FormData();
    payload.set('locale', locale);
    const result = await signOutOtherActiveDevices(payload);

    setSessionLoading(false);

    if (result?.error) {
      setSessionError(result.error);
      return;
    }

    setSessionMessage(
      isEs
        ? 'Se cerro sesion en todos los demas dispositivos activos.'
        : 'You are now signed out of all other active devices.'
    );
  }

  const currentSessionLabel = isEs ? 'Sesion actual' : 'Current Session';
  const currentDeviceHint = isEs ? 'Este dispositivo y navegador' : 'This device and browser';
  const otherDevicesHint = isEs
    ? 'Si hay otras sesiones activas, se cerraran cuando pulses el boton inferior.'
    : 'If other sessions are active, they will be revoked when you use the button below.';
  const rememberedDevicesLabel = isEs
    ? `Sesiones recordadas activas: ${activeRememberedSessions}`
    : `Active remembered sessions: ${activeRememberedSessions}`;
  const signOutOthersLabel = isEs
    ? 'Cerrar sesion en todos los demas dispositivos activos'
    : 'Sign out of all other active devices';

  return (
    <div className="pt-6 md:pt-8 space-y-6">
      <div className="px-6 md:px-8">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.securityCredentials}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.securityCredentialsDescription}</p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div className="border-y border-slate-200">
          <div className="divide-y divide-slate-200">
            <div className="px-6 md:px-8 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translations.dashboard.newPassword}</p>
                <p className="mt-1 text-sm font-medium text-slate-400 italic">••••••••</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPassword((current) => !current)}
                  className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {editingPassword ? (isEs ? 'Cerrar' : 'Close') : (isEs ? 'Editar' : 'Edit')}
                </button>
                {editingPassword ? (
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

            <div className={editingPassword ? 'px-6 md:px-8 py-4 space-y-4' : 'hidden'}>
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.newPassword}</label>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.dashboard.confirmNewPassword}</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </form>

      <div className="px-6 md:px-8 pb-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{translations.dashboard.sessionSecurity}</h4>
          <p className="mt-1 text-xs text-slate-500">{translations.dashboard.sessionSecurityDescription}</p>

          <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-700">{currentSessionLabel}</p>
            <p className="mt-0.5 text-xs text-slate-500">{currentDeviceHint}</p>
          </div>

          <p className="mt-3 text-xs text-slate-500">{otherDevicesHint}</p>
          <p className="mt-1 text-xs text-slate-500">{rememberedDevicesLabel}</p>

          {sessionError ? (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
              {sessionError}
            </div>
          ) : null}

          {sessionMessage ? (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-lg font-medium">
              {sessionMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSignOutOtherDevices}
            disabled={sessionLoading}
            className="mt-3 cursor-pointer rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sessionLoading ? (isEs ? 'Cerrando sesiones...' : 'Signing out sessions...') : signOutOthersLabel}
          </button>
        </div>
      </div>
    </div>
  );
}