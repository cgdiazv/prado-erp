'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cancelSubscription } from './actions';
import { getTranslations } from '@/lib/translations';

interface SubscriptionCancellationCardProps {
  currentSubscriptionStatus: string | null;
  locale?: string;
}

function formatSubscriptionStatus(status: string | null, locale: string = 'en') {
  const translations = getTranslations(locale);
  switch (status) {
    case 'individual':
      return 'Individual Plan';
    case 'growth':
      return 'Growth Plan';
    case 'enterprise':
      return 'Enterprise Plan';
    case 'trial':
      return 'Trial Plan';
    default:
      return 'No active subscription';
  }
}

export default function SubscriptionCancellationCard({ currentSubscriptionStatus, locale = 'en' }: SubscriptionCancellationCardProps) {
  const translations = getTranslations(locale);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const otherReasonOption = 'Other';

  const cancellationReasons = [
    'Too expensive for my current needs',
    'Missing features I need',
    'Switching to another platform',
    'I am not using it enough',
    'Technical issues or bugs',
    'Support response was not fast enough',
  ];

  const subscriptionLabel = formatSubscriptionStatus(currentSubscriptionStatus, locale);
  const canCancel =
    currentSubscriptionStatus === 'individual' ||
    currentSubscriptionStatus === 'growth' ||
    currentSubscriptionStatus === 'enterprise';
  const hasOtherReasonSelected = selectedReasons.includes(otherReasonOption);
  const canSubmitReasons =
    selectedReasons.length > 0 &&
    (!hasOtherReasonSelected || otherReason.trim().length > 0);

  function toggleReason(reason: string) {
    setSelectedReasons((previous) => {
      if (previous.includes(reason)) {
        return previous.filter((item) => item !== reason);
      }
      return [...previous, reason];
    });
  }

  async function handleCancel(reasons: string[]) {
    setIsPending(true);
    setFeedback(null);

    const result = await cancelSubscription(reasons);

    if (result?.error) {
      setFeedback(result.error);
      setIsPending(false);
      return;
    }

    setFeedback('Your subscription has been canceled and the workspace is now on the trial plan.');
    setIsModalOpen(false);
    setSelectedReasons([]);
    setOtherReason('');
    setIsPending(false);
    router.refresh();
  }

  async function handleCancelWithReasons() {
    if (!canSubmitReasons) {
      return;
    }

    const reasonPayload = hasOtherReasonSelected
      ? selectedReasons
          .filter((reason) => reason !== otherReasonOption)
          .concat(`Other: ${otherReason.trim().slice(0, 500)}`)
      : selectedReasons;

    await handleCancel(reasonPayload);
  }

  async function handleCancelWithoutReasons() {
    await handleCancel([]);
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{translations.dashboard.subscriptionManagement}</h3>
        <p className="text-xs text-slate-400">{translations.dashboard.subscriptionManagementDescription}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">{translations.dashboard.currentSubscription}</p>
            <p className="text-xs text-slate-500">{subscriptionLabel}</p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${canCancel ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            {canCancel ? translations.dashboard.activeStatus : translations.dashboard.trialNoActivePlan}
          </span>
        </div>

        {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isPending || !canCancel}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? translations.dashboard.cancelingLoading : translations.dashboard.cancelSubscription}
        </button>

        <p className="text-xs text-slate-400">
          {translations.dashboard.subscriptionCancellationMessage}
        </p>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Before you cancel</h4>
                <p className="mt-1 text-sm text-slate-500">Select one or more reasons (optional but helpful).</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close cancellation modal"
              >
                x
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {cancellationReasons.map((reason) => (
                <label key={reason} className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasOtherReasonSelected}
                  onChange={() => toggleReason(otherReasonOption)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{otherReasonOption}</span>
              </label>

              {hasOtherReasonSelected ? (
                <textarea
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Tell us more"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelWithoutReasons}
                disabled={isPending}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Just cancel without answering
              </button>
              <button
                type="button"
                onClick={handleCancelWithReasons}
                disabled={isPending || !canSubmitReasons}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? translations.dashboard.cancelingLoading : 'Cancel and send feedback'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
