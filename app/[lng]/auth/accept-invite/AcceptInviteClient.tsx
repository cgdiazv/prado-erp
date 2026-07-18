"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { acceptTeamInvitation, login } from '../actions';
import { getTranslations } from '@/lib/translations';

interface AcceptInviteClientProps {
  locale: string;
  token: string;
  email: string;
  organizationName: string;
  role: string;
}

export default function AcceptInviteClient({ locale, token, email, organizationName, role }: AcceptInviteClientProps) {
  const translations = getTranslations(locale);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const roleLabel = role;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set('token', token);
    formData.set('password', password);

    const result = await acceptTeamInvitation(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setLoading(false);
      return;
    }

    const loginFormData = new FormData();
    loginFormData.set('email', email);
    loginFormData.set('password', password);

    const loginResult = await login(loginFormData);

    if (loginResult?.error) {
      setErrorMessage('Invitation accepted, but automatic sign-in failed. Please log in manually.');
      setLoading(false);
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <main className="flex-1 flex items-center justify-center p-6 text-gray-900 bg-white">
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm transition duration-150">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-emerald-700">Accept Team Invitation</h1>
            <p className="text-sm text-gray-500 mt-2">Set a password to verify your access to {organizationName}.</p>
          </header>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <div className="mb-4 rounded-lg border border-gray-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Role:</strong> {roleLabel}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm mt-2 flex items-center justify-center outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              {loading ? 'Saving...' : 'Set Password and Continue'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
            <Link href={`/${locale}/login`} className="text-emerald-600 hover:underline font-semibold">
              Go to login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
