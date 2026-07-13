'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function MobileSidebarToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get('sidebar') === 'open';

  const toggleSidebar = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isOpen) {
      params.delete('sidebar');
    } else {
      params.set('sidebar', 'open');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <button
      onClick={toggleSidebar}
      className="md:hidden fixed bottom-6 right-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition outline-none cursor-pointer"
      aria-label="Toggle Navigation Sidebar"
    >
      {isOpen ? (
        /* Close Icon */
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        /* Hamburger Menu Icon */
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );
}