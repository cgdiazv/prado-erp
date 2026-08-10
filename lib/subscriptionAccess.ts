export type NormalizedSubscriptionStatus = 'trial' | 'individual' | 'growth' | 'enterprise' | 'unknown';

export function normalizeSubscriptionStatus(status: string | null | undefined): NormalizedSubscriptionStatus {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'trial') return 'trial';
  if (normalized === 'individual') return 'individual';
  if (normalized === 'growth') return 'growth';
  if (normalized === 'enterprise') return 'enterprise';

  return 'unknown';
}

export function hasEnterpriseEquivalentAccess(status: string | null | undefined): boolean {
  const tier = normalizeSubscriptionStatus(status);
  return tier === 'trial' || tier === 'enterprise';
}

export function canUseTeamFeatures(status: string | null | undefined): boolean {
  const tier = normalizeSubscriptionStatus(status);
  return tier === 'trial' || tier === 'growth' || tier === 'enterprise';
}

export function canUseDispatchEngine(status: string | null | undefined): boolean {
  const tier = normalizeSubscriptionStatus(status);
  return tier === 'growth' || tier === 'trial' || tier === 'enterprise';
}

export function canUseExpenseLedger(status: string | null | undefined): boolean {
  const tier = normalizeSubscriptionStatus(status);
  return tier === 'growth' || tier === 'trial' || tier === 'enterprise';
}

export function canUseOnlineInvoicePayments(status: string | null | undefined): boolean {
  const tier = normalizeSubscriptionStatus(status);
  return tier === 'growth' || tier === 'trial' || tier === 'enterprise';
}

export function canUseAccountingIntegrations(status: string | null | undefined): boolean {
  return hasEnterpriseEquivalentAccess(status);
}

export function getSeatLimitForPlan(status: string | null | undefined): number | null {
  const tier = normalizeSubscriptionStatus(status);

  if (tier === 'trial' || tier === 'enterprise') {
    return null;
  }

  if (tier === 'growth') {
    return 5;
  }

  return 1;
}
