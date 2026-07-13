'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cancelSubscription } from '@/app/dashboard/settings/actions';

interface SubscriptionCancellationCardProps {
  currentSubscriptionStatus: string | null;
}

function formatSubscriptionStatus(status: string | null) {
  switch (status) {
    case 'individual':
      return 'Individual Plan';
    case 'enterprise':
      return 'Enterprise Plan';
    case 'trial':
      return 'Trial Plan';
    default:
      return 'No active subscription';
  }
}

export default function SubscriptionCancellationCard({ currentSubscriptionStatus }: SubscriptionCancellationCardProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const subscriptionLabel = formatSubscriptionStatus(currentSubscriptionStatus);
  const canCancel = currentSubscriptionStatus === 'individual' || currentSubscriptionStatus === 'enterprise';

  async function handleCancel() {
    const confirmed = window.confirm(
      `Cancel your current ${subscriptionLabel.toLowerCase()}? This will switch your workspace back to the trial experience.`
    );

    if (!confirmed) {
      return;
    }

    setIsPending(true);
    setFeedback(null);

    const result = await cancelSubscription();

    if (result?.error) {
      setFeedback(result.error);
      setIsPending(false);
      return;
    }

    setFeedback('Your subscription has been canceled and the workspace is now on the trial plan.');
    setIsPending(false);
    router.refresh();
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Subscription Management</h3>
        <p className="text-xs text-slate-400">Review your active plan and cancel it from here when needed.</p>
      </div>

      <div className="max-w-2xl rounded-xl border border-gray-200 bg-slate-50 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Current subscription</p>
            <p className="text-xs text-slate-500">{subscriptionLabel}</p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${canCancel ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            {canCancel ? 'Active' : 'Trial / No active plan'}
          </span>
        </div>

        {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}

        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending || !canCancel}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Canceling...' : 'Cancel Subscription'}
        </button>

        <p className="text-xs text-slate-400">
          Cancelling will end the active paid plan and switch the workspace to the trial experience.
        </p>
      </div>
    </div>
  );
}
