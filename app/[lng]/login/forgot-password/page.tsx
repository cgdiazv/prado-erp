"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;

    // Request recovery token link from Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('success');
      setMessage("Check your email context inbox! We've dispatched a secure password update link.");
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center p-6 text-gray-900">
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-xs">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-emerald-700">Recover Password</h1>
            <p className="text-sm text-gray-500 mt-1">Provide your verified system account email</p>
          </header>

          {status === 'success' ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg font-medium">
                {message}
              </div>
              <Link href="/login" className="inline-block text-sm font-semibold text-emerald-600 hover:underline pt-2">
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
                  {message}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  placeholder="admin@company.com" 
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition" 
                />
              </div>

              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition text-sm shadow-xs mt-2"
              >
                {status === 'loading' ? "Processing request..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}