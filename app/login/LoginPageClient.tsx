'use client';

import { login } from '../auth/actions';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';
import PublicNavbar from '@/components/PublicNavbar';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Account created successfully! Log in below to access your workspace.');
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
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setErrorMessage('An unexpected network error occurred.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <PublicNavbar theme="light" />

      <main className="flex-1 flex items-center justify-center p-6 text-gray-900 bg-white">
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm transition duration-150">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-emerald-700">Login</h1>
            <p className="text-sm text-gray-500 mt-1">Access your operational dashboard hub</p>
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
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
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
                <label className="block text-xs font-semibold text-gray-500 uppercase">Password</label>
                <Link
                  href="/login/forgot-password"
                  className="text-[11px] font-semibold text-emerald-600 hover:underline outline-none"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                required
                disabled={loading}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm mt-2 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 outline-none flex items-center justify-center cursor-pointer"
            >
              {loading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
            New tenant? <Link href="/signup" className="text-emerald-600 hover:underline font-semibold">Register your organization</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
