"use client";

import { signup } from '../auth/actions';
import Link from 'next/link';
import { useState, FormEvent } from 'react';
import PublicNavbar from '@/components/PublicNavbar';

export default function SignUpPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await signup(formData);
      
      if (result?.error) {
        setErrorMessage(result.error);
        setLoading(false);
      }
    } catch {
      setErrorMessage("An unexpected server error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Reusable White Public Navbar Wrapper */}
      <PublicNavbar />

      {/* Central Interactive Signup Form Viewport */}
      <main className="flex-1 flex items-center justify-center p-6 text-gray-900 bg-white">
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm transition duration-150">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-emerald-700">Register</h1>
            <p className="text-sm text-gray-500 mt-1">Create Business Profile</p>
          </header>

          {/* ERROR DISPLAY ALERT */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
              {typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company Name</label>
              <input 
                type="text" 
                name="companyName" 
                required 
                placeholder="e.g., Green Clean Lawn Care" 
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition" 
              />
            </div>
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
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                name="password" 
                required 
                placeholder="••••••••" 
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 transition" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm mt-2 flex items-center justify-center outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              {loading ? "Creating Profile..." : "Create My Account & Get Started"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 hover:underline font-semibold">
              Log in here
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}