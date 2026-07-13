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
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.securityCredentials}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.securityCredentialsDescription}</p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition" 
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? translations.dashboard.updatePasswordLoading : translations.dashboard.updatePassword}
        </button>
      </form>
    </div>
  );
}