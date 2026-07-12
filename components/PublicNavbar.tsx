'use client';

import Link from 'next/link';

export default function PublicNavbar() {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 py-4 select-none">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Logo Brand Link */}
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition">
          <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
            </svg>
          </span>
          Prado
        </Link>

        {/* Action Triggers */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Responsive Demo Link */}
          <Link 
            href="/demo" 
            className="text-sm font-medium transition text-slate-500 hover:text-slate-900"
          >
            <span className="hidden md:inline">Book Demo</span>
            <span className="md:hidden">Demo</span>
          </Link>

          <Link 
            href="/login" 
            className="text-sm font-medium transition text-slate-500 hover:text-slate-900"
          >
            Sign In
          </Link>
          
          {/* Responsive Trial Button */}
          <Link 
            href="/signup" 
            className="text-sm font-semibold px-3 md:px-3.5 py-2 rounded-lg transition shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10 whitespace-nowrap"
          >
            <span className="hidden md:inline">Start Free Trial</span>
            <span className="md:hidden">Trial</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}