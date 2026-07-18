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

const ORG_SELECT_WITH_STRIPE = 'id, name, logo_url, trial_starts_at, subscription_status, stripe_account_id, stripe_account_charges_enabled, stripe_account_payouts_enabled, slogan, phone, street_address, city, state, zip_code, max_jobs_per_truck, auto_optimize_drive_routes, created_at';
const ORG_SELECT_WITH_MAX = 'id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code, max_jobs_per_truck, auto_optimize_drive_routes, created_at';
const ORG_SELECT_LEGACY = 'id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code, created_at';

type OrganizationCandidate = {
  organization: any;
  role: string;
};

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

async function collectCandidatesForSelect(supabase: any, userId: string, select: string) {
  const [ownedResult, membershipResult] = await Promise.all([
    supabase
      .from('organizations')
      .select(select)
      .eq('owner_id', userId),
    supabase
      .from('organization_users')
      .select(`role, organizations(${select})`)
      .eq('user_id', userId),
  ]);

  if (ownedResult.error || membershipResult.error) {
    return { candidates: [] as OrganizationCandidate[], error: ownedResult.error || membershipResult.error };
  }

  const candidates: OrganizationCandidate[] = [];

  for (const row of ownedResult.data || []) {
    if (!row?.id) continue;
    candidates.push({ organization: row, role: 'owner' });
  }

  for (const membership of membershipResult.data || []) {
    const rawOrg = (membership as any)?.organizations;
    const org = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg;
    if (!org?.id) continue;
    candidates.push({ organization: org, role: (membership as any)?.role || 'member' });
  }

  const dedupedByOrg = new Map<string, OrganizationCandidate>();
  for (const candidate of candidates) {
    const orgId = candidate.organization.id;
    const existing = dedupedByOrg.get(orgId);
    if (!existing) {
      dedupedByOrg.set(orgId, candidate);
      continue;
    }

    if (existing.role !== 'owner' && candidate.role === 'owner') {
      dedupedByOrg.set(orgId, candidate);
    }
  }

  return { candidates: Array.from(dedupedByOrg.values()), error: null };
}

async function scoreOrganizationActivity(supabase: any, organizationId: string) {
  const [customers, services, estimates, expenses, trucks] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('estimates').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('trucks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
  ]);

  return [customers, services, estimates, expenses, trucks]
    .map((result) => Number(result.count || 0))
    .reduce((total, current) => total + current, 0);
}

export async function getUserOrganization(userId: string): Promise<UserOrganizationResult> {
  const supabase = createAdminClient();

  let candidates: OrganizationCandidate[] = [];

  for (const select of [ORG_SELECT_WITH_STRIPE, ORG_SELECT_WITH_MAX, ORG_SELECT_LEGACY]) {
    const result = await collectCandidatesForSelect(supabase, userId, select);
    if (!result.error) {
      candidates = result.candidates;
      break;
    }
  }

  if (candidates.length === 0) {
    return { organization: null, role: null };
  }

  const scoredCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const score = await scoreOrganizationActivity(supabase, candidate.organization.id);
      return { ...candidate, score };
    })
  );

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.role === 'owner' && b.role !== 'owner') return -1;
    if (b.role === 'owner' && a.role !== 'owner') return 1;

    const aCreated = a.organization?.created_at ? Date.parse(a.organization.created_at) : Number.MAX_SAFE_INTEGER;
    const bCreated = b.organization?.created_at ? Date.parse(b.organization.created_at) : Number.MAX_SAFE_INTEGER;
    return aCreated - bCreated;
  });

  const winner = scoredCandidates[0];
  return {
    organization: winner?.organization ? normalizeOrganizationRow(winner.organization) : null,
    role: winner?.role || null,
  };
}
