import { login } from '../auth/actions';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Reusable Public Navbar Wrapper */}
      <PublicNavbar />
      
      {/* Central Interactive Login Form Viewport */}
      <main className="flex-1 flex items-center justify-center p-6 text-gray-900 bg-white">
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm transition duration-150">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-emerald-700">Login</h1>
            <p className="text-sm text-gray-500 mt-1">Access your operational dashboard hub</p>
          </header>

          <form action={login as (formData: FormData) => void} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                name="email" 
                required 
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 transition" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                name="password" 
                required 
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 transition" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm mt-2 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 outline-none"
            >
              Sign In to Dashboard
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