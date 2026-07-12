import { signup } from '../auth/actions';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-900">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-700">Register</h1>
          {/* Streamlined subtext */}
          <p className="text-sm text-gray-500 mt-1">Create Business Profile</p>
        </header>

        <form action={signup as any} className="space-y-4">
          <div>
            {/* Cleaned labels and placeholders */}
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company Name</label>
            <input type="text" name="companyName" required placeholder="e.g., Green Clean Lawn Care" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
            <input type="email" name="email" required placeholder="admin@company.com" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
            <input type="password" name="password" required placeholder="••••••••" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition text-sm shadow-sm mt-2">
            Create My Account & Get Started
          </button>
        </form>

        {/* Added return to login link path */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 hover:underline font-semibold">
            Log in here
          </Link>
        </div>
      </div>
    </main>
  );
}