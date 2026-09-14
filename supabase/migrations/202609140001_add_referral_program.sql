-- Add referral and subscription tracking columns to organizations
alter table public.organizations
add column if not exists referral_code text unique,
add column if not exists referred_by_org_id uuid references public.organizations(id) on delete set null,
add column if not exists stripe_subscription_id text,
add column if not exists stripe_customer_id text,
add column if not exists referral_discount_active boolean not null default false,
add column if not exists referral_discount_ends_at timestamptz;

-- Generate unique referral codes for any existing organizations that don't have one
update public.organizations
set referral_code = upper(substring(md5(random()::text || id::text) from 1 for 8))
where referral_code is null;

-- Set default for new rows going forward
alter table public.organizations
alter column referral_code set default upper(substring(md5(random()::text) from 1 for 8));

comment on column public.organizations.referral_code is 'Unique 8-character referral code used to generate the referral share link.';
comment on column public.organizations.referred_by_org_id is 'Organization that referred this customer.';
comment on column public.organizations.stripe_subscription_id is 'Active Stripe subscription ID (e.g. sub_12345).';
comment on column public.organizations.stripe_customer_id is 'Stripe customer ID (e.g. cus_12345).';
comment on column public.organizations.referral_discount_active is 'Whether a 50% referral discount is currently active on this subscription.';
comment on column public.organizations.referral_discount_ends_at is 'Expiration timestamp of the 12-month 50% referral discount.';

-- Create referrals tracking table
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_org_id uuid not null references public.organizations(id) on delete cascade,
  referred_org_id uuid references public.organizations(id) on delete set null,
  referred_company_name text,
  status text not null default 'pending', -- 'pending' (signed up/in trial), 'rewarded' (subscribed & 50% discount applied), 'cancelled'
  rewarded_at timestamptz,
  reward_applied_at timestamptz,
  reward_ends_at timestamptz,
  discount_applied boolean not null default false,
  discount_months integer not null default 0,
  stripe_discount_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_referrals_referrer_org_id on public.referrals(referrer_org_id);
create index if not exists idx_referrals_referred_org_id on public.referrals(referred_org_id);
create index if not exists idx_organizations_referral_code on public.organizations(referral_code);

-- Enable RLS
alter table public.referrals enable row level security;

-- Policy: Organization members can view referrals made by their organization
drop policy if exists "Members can view their organization referrals" on public.referrals;
create policy "Members can view their organization referrals"
  on public.referrals
  for select
  using (
    exists (
      select 1 from public.organization_users ou
      where ou.organization_id = referrals.referrer_org_id
        and ou.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organizations org
      where org.id = referrals.referrer_org_id
        and org.owner_id = auth.uid()
    )
  );
