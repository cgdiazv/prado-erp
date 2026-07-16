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
};

export type UserOrganizationResult = {
  organization: UserOrganization | null;
  role: string | null;
};

export async function getUserOrganization(userId: string): Promise<UserOrganizationResult> {
  const supabase = await createClient();

  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code')
    .eq('owner_id', userId)
    .maybeSingle();

  if (ownedOrg) {
    return { organization: ownedOrg as UserOrganization, role: 'owner' };
  }

  const { data: membership } = await supabase
    .from('organization_users')
    .select('role, organizations(id, name, logo_url, trial_starts_at, subscription_status, slogan, phone, street_address, city, state, zip_code)')
    .eq('user_id', userId)
    .maybeSingle();

  const organization = (membership as any)?.organizations || null;
  const role = (membership as any)?.role || null;

  return { organization: organization as UserOrganization | null, role };
}
