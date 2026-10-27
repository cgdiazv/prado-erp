'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ChevronDown, FileText, Calendar, Receipt, DollarSign } from 'lucide-react';

interface DashboardQuickActionsProps {
  locale: string;
  canAccessExpenseLedger: boolean;
  labels: {
    actions: string;
    manageQuotes: string;
    scheduleJob: string;
    manageInvoices: string;
    trackExpenses: string;
  };
}

export default function DashboardQuickActions({
  locale,
  canAccessExpenseLedger,
  labels,
}: DashboardQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const items = [
    {
      label: labels.manageQuotes,
      href: `/${locale}/dashboard/estimates`,
      icon: FileText,
    },
    {
      label: labels.scheduleJob,
      href: `/${locale}/dashboard/schedule`,
      icon: Calendar,
    },
    {
      label: labels.manageInvoices,
      href: `/${locale}/dashboard/invoices-ledger`,
      icon: Receipt,
    },
    ...(canAccessExpenseLedger
      ? [
          {
            label: labels.trackExpenses,
            href: `/${locale}/dashboard/expense-ledger`,
            icon: DollarSign,
          },
        ]
      : []),
  ];

  return (
    <div className="tour-quick-actions relative flex w-full sm:w-auto items-center sm:ml-auto sm:justify-end">
      {/* Mobile / Tablet (< md): Collapsed + Actions Dropdown */}
      <div ref={dropdownRef} className="relative w-full sm:w-auto md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="cursor-pointer flex w-full sm:w-auto sm:inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-3 py-2 text-xs font-semibold transition shadow-sm"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-100 shrink-0" />
          <span>{labels.actions}</span>
          <ChevronDown
            className={`h-3 w-3 text-emerald-100 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-1.5 z-50 w-full sm:w-52 origin-top-right overflow-hidden rounded-xl border border-gray-200/90 bg-white p-1.5 shadow-xl transition-all"
          >
            <div className="space-y-0.5">
              {items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <IconComponent className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 shrink-0 transition-colors" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desktop (>= md): Full button row */}
      <div className="hidden md:flex items-center gap-2">
        <Link
          href={`/${locale}/dashboard/estimates`}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>{labels.manageQuotes}</span>
        </Link>

        <Link
          href={`/${locale}/dashboard/schedule`}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>{labels.scheduleJob}</span>
        </Link>

        <Link
          href={`/${locale}/dashboard/invoices-ledger`}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>{labels.manageInvoices}</span>
        </Link>

        {canAccessExpenseLedger && (
          <Link
            href={`/${locale}/dashboard/expense-ledger`}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{labels.trackExpenses}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
