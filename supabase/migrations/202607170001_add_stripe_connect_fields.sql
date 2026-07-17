alter table public.organizations
  add column if not exists stripe_account_id text,
  add column if not exists stripe_account_charges_enabled boolean default false,
  add column if not exists stripe_account_payouts_enabled boolean default false;

create index if not exists idx_organizations_stripe_account_id
  on public.organizations (stripe_account_id);
