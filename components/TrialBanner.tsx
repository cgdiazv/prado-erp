'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface TrialBannerProps {
  trialStartsAt: string;
}

export default function TrialBanner({ trialStartsAt }: TrialBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalTrialMs = 14 * 24 * 60 * 60 * 1000;
  const expiryDate = new Date(new Date(trialStartsAt).getTime() + totalTrialMs);
  const now = new Date();
  
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // If the trial has run out, don't show the banner
  if (daysLeft <= 0) return null;

  const handleOpenBilling = () => {
    // Create a new URLSearchParams instance to preserve existing parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set('billing', 'true');
    
    // Updates the route state in-place, which triggers the layout's modal overlay instantly
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold">You are currently using a Free Trial</p>
          <p className="text-xs text-emerald-100 font-medium">
            Your full-access evaluation period has <strong className="text-white font-bold">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining</strong>.
          </p>
        </div>
      </div>
      
      <button 
        onClick={handleOpenBilling}
        className="inline-flex items-center justify-center bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-2 rounded-lg transition whitespace-nowrap shadow-xs self-start sm:self-center cursor-pointer border-none outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      >
        Upgrade Workspace Plan
      </button>
    </div>
  );
}