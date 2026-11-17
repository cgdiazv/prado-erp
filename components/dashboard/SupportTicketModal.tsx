'use client';

import { useEffect, useState } from 'react';
import SupportTicketForm from '@/components/SupportTicketForm';
import { getTranslations } from '@/lib/translations';

interface SupportTicketModalProps {
  locale: string;
}

export default function SupportTicketModal({ locale }: SupportTicketModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const translations = getTranslations(locale);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {isEs ? 'Contactar soporte' : 'Contact Support'}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={translations.support.formTitle}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-h-0 overflow-y-auto rounded-2xl">
              <SupportTicketForm locale={locale} theme="light" onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
