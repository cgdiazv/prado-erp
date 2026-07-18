import { createAdminClient } from '@/lib/supabaseServer';

export type UserOrganization = {
  id: string;
  name: string;
  logo_url: string | null;
  trial_starts_at: string | null;
  subscription_status: string | null;
  stripe_account_id: string | null;
  stripe_account_charges_enabled: boolean | null;
  stripe_account_payouts_enabled: boolean | null;
  slogan: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  max_jobs_per_truck: number | null;
  auto_optimize_drive_routes: boolean | null;
};

export type UserOrganizationResult = {
  organization: UserOrganization | null;
  role: string | null;
};

const ORG_SELECT_WITH_STRIPE = 'id, name, logo_url, trial_starts_at, subscription_status, stripe_account_id, stripe_account_charges_enabled, stripe_account_payouts_enabled, slogan, phone, street_address, city, state, zip_code, max_jobs_per_truck, auto_optimize_drive_routes';
const ORG_SELECT_WITH_MAX = 'id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code, max_jobs_per_truck, auto_optimize_drive_routes';
const ORG_SELECT_LEGACY = 'id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code';

function normalizeOrganizationRow(row: any): UserOrganization {
  return {
    ...row,
    stripe_account_id: typeof row?.stripe_account_id === 'string' ? row.stripe_account_id : null,
    stripe_account_charges_enabled:
      typeof row?.stripe_account_charges_enabled === 'boolean' ? row.stripe_account_charges_enabled : false,
    stripe_account_payouts_enabled:
      typeof row?.stripe_account_payouts_enabled === 'boolean' ? row.stripe_account_payouts_enabled : false,
    max_jobs_per_truck:
      typeof row?.max_jobs_per_truck === 'number' ? row.max_jobs_per_truck : null,
    auto_optimize_drive_routes:
      typeof row?.auto_optimize_drive_routes === 'boolean' ? row.auto_optimize_drive_routes : true,
  } as UserOrganization;
}

async function selectFirstOwnedOrganization(supabase: any, userId: string, select: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select(select)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const row = Array.isArray(data) ? data[0] || null : null;
  return { row, error };
}

async function selectFirstMembership(supabase: any, userId: string, select: string) {
  const { data, error } = await supabase
    .from('organization_users')
    .select(select)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const row = Array.isArray(data) ? data[0] || null : null;
  return { row, error };
}

export async function getUserOrganization(userId: string): Promise<UserOrganizationResult> {
  const supabase = createAdminClient();

  const withStripeOwned = await selectFirstOwnedOrganization(supabase, userId, ORG_SELECT_WITH_STRIPE);

  let ownedOrg: any = withStripeOwned.row;
  let ownedOrgError: any = withStripeOwned.error;

  if (ownedOrgError) {
    const withMaxOwned = await selectFirstOwnedOrganization(supabase, userId, ORG_SELECT_WITH_MAX);

    ownedOrg = withMaxOwned.row;
    ownedOrgError = withMaxOwned.error;
  }

  if (ownedOrgError) {
    const fallbackOwned = await selectFirstOwnedOrganization(supabase, userId, ORG_SELECT_LEGACY);

    ownedOrg = fallbackOwned.row;
    ownedOrgError = fallbackOwned.error;
  }

  if (ownedOrg) {
    return { organization: normalizeOrganizationRow(ownedOrg), role: 'owner' };
  }

  const withStripeMembership = await selectFirstMembership(
    supabase,
    userId,
    `role, organizations(${ORG_SELECT_WITH_STRIPE})`
  );

  let membership: any = withStripeMembership.row;
  let membershipError: any = withStripeMembership.error;

  if (membershipError) {
    const withMaxMembership = await selectFirstMembership(
      supabase,
      userId,
      `role, organizations(${ORG_SELECT_WITH_MAX})`
    );

    membership = withMaxMembership.row;
    membershipError = withMaxMembership.error;
  }

  if (membershipError) {
    const fallbackMembership = await selectFirstMembership(
      supabase,
      userId,
      `role, organizations(${ORG_SELECT_LEGACY})`
    );

    membership = fallbackMembership.row;
    membershipError = fallbackMembership.error;
  }

  const rawOrganization = (membership as any)?.organizations || null;
  const organization = Array.isArray(rawOrganization) ? rawOrganization[0] || null : rawOrganization;
  const role = (membership as any)?.role || null;

  return { organization: organization ? normalizeOrganizationRow(organization) : null, role };
}
