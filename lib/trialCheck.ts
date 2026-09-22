export interface TrialStatus {
  isExpired: boolean;
  daysRemaining: number;
}

export const TRIAL_DAYS = 30;
export const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

const ACTIVE_PAID_STATUSES = new Set([
  'active',
  'individual',
  'growth',
  'enterprise',
]);

export function checkTrialExpiry(trialStartsAt: string | Date | null, status: string | null): TrialStatus {
  const normalized = String(status || '').trim().toLowerCase();

  // If their subscription status is already active or a paid tier, they are good to go
  if (ACTIVE_PAID_STATUSES.has(normalized)) {
    return { isExpired: false, daysRemaining: 30 };
  }

  // If their status is explicitly cancelled or past_due, their subscription has ended
  if (normalized === 'cancelled' || normalized === 'past_due' || normalized === 'expired') {
    return { isExpired: true, daysRemaining: 0 };
  }

  // Default start date to now if missing for trial status so trial is active
  const startDate = trialStartsAt ? new Date(trialStartsAt) : new Date();
  const expiryDate = new Date(startDate.getTime() + TRIAL_DURATION_MS);
  const now = new Date();

  const timeDiff = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

  return {
    isExpired: now > expiryDate,
    daysRemaining
  };
}

export function getTrialDaysLeft(trialStartsAt: string | Date): number {
  const start = new Date(trialStartsAt);
  const expiryDate = new Date(start.getTime() + TRIAL_DURATION_MS);
  const now = new Date();
  
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return daysLeft > 0 ? daysLeft : 0;
}