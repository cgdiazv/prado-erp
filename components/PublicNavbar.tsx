'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PublicNavbar() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 select-none">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Logo Brand Link */}
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition">
          <span className="h-5 w-5 rounded bg-gradient-to-tr from-emerald-500 to-teal-400 block shadow-md shadow-emerald-500/20"></span>
          Prado
        </Link>

        {/* Action Triggers */}
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className={`text-sm font-medium transition ${
              activeTab !== 'signup' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className={`text-sm font-semibold px-3.5 py-2 rounded-lg transition shadow-xs ${
              activeTab === 'signup' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-emerald-500/5' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
            }`}
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}