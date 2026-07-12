export interface TrialStatus {
  isExpired: boolean;
  daysRemaining: number;
}

export function checkTrialExpiry(trialStartsAt: string | Date | null, status: string | null): TrialStatus {
  // If their Stripe subscription status is already active, they are good to go
  if (status === 'active') {
    return { isExpired: false, daysRemaining: 0 };
  }

  if (!trialStartsAt) {
    return { isExpired: true, daysRemaining: 0 };
  }

  const startDate = new Date(trialStartsAt);
  const expiryDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 Days in milliseconds
  const now = new Date();

  const timeDiff = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

  return {
    isExpired: now > expiryDate,
    daysRemaining
  };
}