'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TRIAL_DAYS } from '@/lib/trialCheck';

interface BillingModalProps {
  userEmail?: string;
  orgId?: string;
  locale?: string;
}

export default function BillingModal({ userEmail = '', orgId = '', locale = 'en' }: BillingModalProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Read target status out of the URL matrix parameters
  const isExpiredParam = searchParams.get('expired') === 'true';
  const isBillingParam = searchParams.get('billing') === 'true';
  
  const [isOpen, setIsOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (isExpiredParam || isBillingParam) {
      setIsOpen(true);
    }
  }, [isExpiredParam, isBillingParam]);

  if (!isOpen) return null;

  // Build secure URLs with parameters pre-mapped
  const queryParams = `prefilled_email=${encodeURIComponent(userEmail)}&client_reference_id=${orgId}`;
  const individualUrl = `https://pay.delvalletradings.com/b/00wdR85i76E4dXg2Yl4Ni04?${queryParams}`;
  const growthUrl = `https://pay.delvalletradings.com/b/9B614m39Z7I84mG6ax4Ni06?${queryParams}`;
  const enterpriseUrl = `https://pay.delvalletradings.com/b/eVq4gy5i73rS5qKdCZ4Ni05?${queryParams}`;

  const handleClose = () => {
    // If the trial isn't explicitly expired, let them dismiss it safely
    if (!isExpiredParam) {
      setIsOpen(false);
      router.push(`/${locale}/dashboard`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-200/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 space-y-6 text-center shadow-2xl relative text-slate-900 font-sans">
        
        {/* Dismiss Button (Only displayed if their account isn't completely locked) */}
        {!isExpiredParam && (
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer text-sm font-bold p-1"
          >
            ✕
          </button>
        )}
        
        <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isExpiredParam ? `Your ${TRIAL_DAYS}-day trial has concluded` : 'Manage Subscription'}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed text-left sm:text-center">
            To unlock your fleet dispatch routes, database logs, and accounting metrics, choose an operating plan to continue.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed text-left sm:text-center">
            Payments are securely processed by Del Valle Tradings LLC, the legal entity operating Prado.
          </p>
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-700 text-left">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-600"
          />
          <span>
            I agree to Prado&apos;s{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-600 underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-600 underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <div className="space-y-3 pt-2">
          <a 
            href={individualUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!acceptedTerms}
            onClick={(e) => {
              if (!acceptedTerms) e.preventDefault();
            }}
            className={`block w-full text-xs font-bold py-3 rounded-xl transition text-center ${
              acceptedTerms
                ? 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800'
                : 'bg-slate-100 border border-slate-200 text-slate-400 opacity-70 cursor-not-allowed pointer-events-none'
            }`}
          >
            Activate Individual Plan — $29/mo
          </a>
          <a 
            href={growthUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!acceptedTerms}
            onClick={(e) => {
              if (!acceptedTerms) e.preventDefault();
            }}
            className={`block w-full text-white text-xs font-bold py-3 rounded-xl transition shadow-lg text-center ${
              acceptedTerms
                ? 'bg-emerald-700 hover:bg-emerald-600 shadow-emerald-700/10'
                : 'bg-emerald-200 text-emerald-700 opacity-70 cursor-not-allowed pointer-events-none shadow-none'
            }`}
          >
            Activate Growth Plan — $59/mo
          </a>
          <a 
            href={enterpriseUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!acceptedTerms}
            onClick={(e) => {
              if (!acceptedTerms) e.preventDefault();
            }}
            className={`block w-full text-white text-xs font-bold py-3 rounded-xl transition shadow-lg text-center ${
              acceptedTerms
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10'
                : 'bg-emerald-200 text-emerald-700 opacity-70 cursor-not-allowed pointer-events-none shadow-none'
            }`}
          >
            Activate Enterprise Operations — $99/mo
          </a>
        </div>
      </div>
    </div>
  );
}