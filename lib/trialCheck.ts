export interface TrialStatus {
  isExpired: boolean;
  daysRemaining: number;
}

export const TRIAL_DAYS = 30;
export const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

export function checkTrialExpiry(trialStartsAt: string | Date | null, status: string | null): TrialStatus {
  // If their Stripe subscription status is already active, they are good to go
  if (status === 'active') {
    return { isExpired: false, daysRemaining: 0 };
  }

  if (!trialStartsAt) {
    return { isExpired: true, daysRemaining: 0 };
  }

  const startDate = new Date(trialStartsAt);
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