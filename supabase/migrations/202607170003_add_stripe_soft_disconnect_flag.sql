alter table public.organizations
  add column if not exists stripe_soft_disconnected boolean default false;

update public.organizations
set stripe_soft_disconnected = false
where stripe_soft_disconnected is null;

alter table public.organizations
  alter column stripe_soft_disconnected set default false;
