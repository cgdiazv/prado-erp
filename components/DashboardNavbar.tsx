'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface DashboardNavbarProps {
  userInitials?: string; // e.g., "CD" for Carlos Diaz
  organizationLogoUrl?: string;
}

export default function DashboardNavbar({ userInitials = "C", organizationLogoUrl = '' }: DashboardNavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const hasLogo = organizationLogoUrl.trim().length > 0 && !logoLoadFailed;
  
  // Verify state criteria from current URL search parameters
  const isSidebarOpen = searchParams.get('sidebar') === 'open';

  const toggleSidebar = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isSidebarOpen) {
      params.delete('sidebar');
    } else {
      params.set('sidebar', 'open');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  return (
    <nav className="w-full border-b border-gray-200 bg-white sticky top-0 z-50 px-6 py-3 select-none">
      <div className="mx-auto flex justify-between items-center">
        
        {/* Left Side: Logo Branding */}
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition">
          <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
            </svg>
          </span>
          <span className="font-sans">Prado</span>
          <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 ml-1">
            Dashboard
          </span>
        </Link>

        {/* Right Side: Account Settings Avatar & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/settings" 
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold tracking-wider shadow-sm transition transform hover:scale-[1.03] active:scale-[0.97] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
              hasLogo
                ? 'overflow-hidden border border-gray-200 bg-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Account Settings"
          >
            {hasLogo ? (
              <img
                src={organizationLogoUrl}
                alt="Organization logo"
                className="h-full w-full object-contain"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              userInitials.toUpperCase()
            )}
          </Link>

          {/* Mobile Hamburger Toggle Trigger Menu Button placed directly next to initials */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 focus:outline-none transition cursor-pointer"
            aria-label="Toggle workspace side menu"
          >
            {isSidebarOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

      </div>
    </nav>
  );
}