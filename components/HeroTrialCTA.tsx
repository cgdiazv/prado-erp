'use client';

import React, { useState } from 'react';
import LiveDemoModal from '@/components/LiveDemoModal';
import { ArrowRight } from 'lucide-react';
import { getAppPageUrl } from '@/lib/appLinks';

interface HeroTrialCTAProps {
  primaryLabel?: string;
  secondaryLabel?: string;
  variant?: 'hero' | 'section' | 'banner';
  locale?: string;
}

export default function HeroTrialCTA({
  primaryLabel = 'Start 30-Day Free Trial',
  secondaryLabel = 'Explore Live Demo',
  variant = 'hero',
  locale = 'en',
}: HeroTrialCTAProps) {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <>
      <LiveDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        locale={locale}
      />

      {variant === 'hero' && (
        <div className="mt-10 mb-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <a
            href={getAppPageUrl(locale, 'signup')}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{primaryLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="w-full sm:w-auto text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 px-6 py-3.5 rounded-xl transition border border-slate-800 flex items-center justify-center cursor-pointer"
          >
            <span>{secondaryLabel}</span>
          </button>
        </div>
      )}

      {variant === 'section' && (
        <a
          href={getAppPageUrl(locale, 'signup')}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3.5 rounded-xl transition shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <span>{primaryLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      )}
    </>
  );
}
