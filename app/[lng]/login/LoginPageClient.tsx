'use client';

import { login } from '../auth/actions';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';
import PublicNavbar from '@/components/PublicNavbar';
import { getTranslations } from '@/lib/translations';

interface LoginPageClientProps {
  locale: string;
}

export default function LoginPageClient({ locale }: LoginPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const translations = getTranslations(locale);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage(translations.login.successMessage);
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await login(formData);

      if (result?.error) {
        setErrorMessage(result.error);
        setLoading(false);
        return;
      }

      if (result?.success) {
        router.push(`/${locale}/dashboard`);
        router.refresh();
      }
    } catch {
      setErrorMessage(translations.login.genericError);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <PublicNavbar theme="light" locale={locale} />

      <main className="flex-1 flex items-center justify-center p-6 text-gray-900 bg-white">
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm transition duration-150">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-emerald-700">{translations.login.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{translations.login.subtitle}</p>
          </header>

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{translations.login.emailLabel}</label>
              <input
                type="email"
                name="email"
                required
                disabled={loading}
                placeholder="admin@company.com"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase">{translations.login.passwordLabel}</label>
                <Link
                  href={`/${locale}/login/forgot-password`}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline outline-none"
                >
                  {translations.login.forgotPassword}
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 p-2.5 pr-10 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 text-gray-400 hover:text-slate-600 transition outline-none p-0.5 rounded disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm mt-2 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 outline-none flex items-center justify-center cursor-pointer"
            >
              {loading ? translations.login.loadingButton : translations.login.submitButton}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
            {translations.login.registerPrompt} <Link href={`/${locale}/signup`} className="text-emerald-600 hover:underline font-semibold">{translations.login.registerLink}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
