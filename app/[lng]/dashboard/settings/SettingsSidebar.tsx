'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SectionLink {
  id: string;
  label: string;
  href: string;
}

interface SettingsSidebarProps {
  links: SectionLink[];
  locale: string;
}

export default function SettingsSidebar({ links }: SettingsSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-full">
      {/* Mobile Navigation (Horizontal scrolling tabs with matching clean aesthetic) */}
      <nav className="overflow-x-auto pb-2 mb-4 lg:hidden">
        <div className="flex min-w-max items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname?.endsWith(`/${link.id}`);
            return (
              <Link
                key={link.id}
                href={link.href}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-all ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold ring-1 ring-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Navigation (Stacked bordered list-group with site emerald green active accent) */}
      <aside className="hidden lg:block lg:sticky lg:top-8 w-full">
        {/* Outer List Container with border, divider lines, and light-slate fill extending down */}
        <div className="rounded-md border border-slate-200 bg-[#f8fafc] overflow-hidden shadow-2xs min-h-[460px] flex flex-col">
          <nav className="divide-y divide-slate-200/90 flex flex-col">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname?.endsWith(`/${link.id}`);
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  className={`block px-4 py-3.5 text-[14px] leading-snug transition-colors duration-150 border-l-4 ${
                    isActive
                      ? 'bg-white text-emerald-700 font-bold border-l-emerald-600 shadow-2xs'
                      : 'border-l-transparent text-slate-800 font-semibold hover:bg-slate-100/90 hover:text-slate-950 hover:border-l-slate-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {/* Subtle panel space at bottom matching reference design */}
          <div className="flex-1 bg-[#f8fafc]" />
        </div>
      </aside>
    </div>
  );
}
