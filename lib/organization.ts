import { createClient } from '@/lib/supabaseServer';

export type UserOrganization = {
  id: string;
  name: string;
  logo_url: string | null;
  trial_starts_at: string | null;
  subscription_status: string | null;
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

const ORG_SELECT_WITH_MAX = 'id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code, max_jobs_per_truck, auto_optimize_drive_routes';
const ORG_SELECT_LEGACY = 'id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code';

function normalizeOrganizationRow(row: any): UserOrganization {
  return {
    ...row,
    max_jobs_per_truck:
      typeof row?.max_jobs_per_truck === 'number' ? row.max_jobs_per_truck : null,
    auto_optimize_drive_routes:
      typeof row?.auto_optimize_drive_routes === 'boolean' ? row.auto_optimize_drive_routes : true,
  } as UserOrganization;
}

export async function getUserOrganization(userId: string): Promise<UserOrganizationResult> {
  const supabase = await createClient();

  let { data: ownedOrg, error: ownedOrgError } = await supabase
    .from('organizations')
    .select(ORG_SELECT_WITH_MAX)
    .eq('owner_id', userId)
    .maybeSingle();

  if (ownedOrgError) {
    const fallbackOwned = await supabase
      .from('organizations')
      .select(ORG_SELECT_LEGACY)
      .eq('owner_id', userId)
      .maybeSingle();

    ownedOrg = fallbackOwned.data;
    ownedOrgError = fallbackOwned.error;
  }

  if (ownedOrg) {
    return { organization: normalizeOrganizationRow(ownedOrg), role: 'owner' };
  }

  let { data: membership, error: membershipError } = await supabase
    .from('organization_users')
    .select(`role, organizations(${ORG_SELECT_WITH_MAX})`)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) {
    const fallbackMembership = await supabase
      .from('organization_users')
      .select(`role, organizations(${ORG_SELECT_LEGACY})`)
      .eq('user_id', userId)
      .maybeSingle();

    membership = fallbackMembership.data;
    membershipError = fallbackMembership.error;
  }

  const organization = (membership as any)?.organizations || null;
  const role = (membership as any)?.role || null;

  return { organization: organization ? normalizeOrganizationRow(organization) : null, role };
}
