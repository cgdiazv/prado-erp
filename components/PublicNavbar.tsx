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
          {/* Sleek Geometric Negative-Space Leaf Logo */}
          <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-4 h-4 text-white"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.47.16.05.33.03.46-.07.13-.1.2-.26.2-.43V17.5c0-1.93 1.57-3.5 3.5-3.5h1c1.93 0 3.5-1.57 3.5-3.5V6.7c0-.5-.32-.93-.8-1.07C15.11 5.2 13.6 5 12 5V2zm1 8.5c0-.83-.67-1.5-1.5-1.5S10 9.67 10 10.5v2.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-2.5z" fillRule="evenodd" clipRule="evenodd" className="hidden" />
              {/* Clean Modern Leaf Silhouette */}
              <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
            </svg>
          </span>
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