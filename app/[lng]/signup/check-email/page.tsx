import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-900">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <header className="mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl mb-3">
            ✉️
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
          <p className="text-sm text-gray-500 mt-2">
            We sent a verification link to your email address. Please check your inbox and confirm your account to activate your company profile.
          </p>
        </header>

        <div className="mt-8 border-t pt-6">
          <Link 
            href="/login" 
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition text-sm shadow-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </main>
  );
}