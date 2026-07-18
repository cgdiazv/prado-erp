'use client';

import { useState } from 'react';
import { updatePassword } from './actions';
import { getTranslations } from '@/lib/translations';

interface PasswordFormProps {
  locale?: string;
}

export default function PasswordForm({ locale = 'en' }: PasswordFormProps) {
  const translations = getTranslations(locale);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    } else {
      setSuccessMsg(translations.dashboard.passwordUpdatedSuccess);
      event.currentTarget.reset();
      setPassword('');
      setConfirmPassword('');
      setEditingPassword(false);
    }
  }

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
                  {editingPassword ? (locale.toLowerCase().startsWith('es') ? 'Cerrar' : 'Close') : (locale.toLowerCase().startsWith('es') ? 'Editar' : 'Edit')}
                </button>
                {editingPassword ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="cursor-pointer text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400"
                  >
                    {loading ? (locale.toLowerCase().startsWith('es') ? 'Actualizando...' : 'Updating...') : (locale.toLowerCase().startsWith('es') ? 'Actualizar' : 'Update')}
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
    </div>
  );
}