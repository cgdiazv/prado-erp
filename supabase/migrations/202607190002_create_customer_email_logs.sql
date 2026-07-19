create table if not exists public.customer_email_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  sent_by_user_id uuid not null references auth.users (id) on delete cascade,
  to_email text not null,
  subject text not null,
  body_preview text,
  context text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_email_logs_org_created
  on public.customer_email_logs (organization_id, created_at desc);

create index if not exists idx_customer_email_logs_customer_created
  on public.customer_email_logs (customer_id, created_at desc);

alter table public.customer_email_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_email_logs'
      and policyname = 'customer_email_logs_select_member_or_owner'
  ) then
    create policy "customer_email_logs_select_member_or_owner"
    on public.customer_email_logs
    for select
    to authenticated
    using (
      exists (
        select 1 from public.organizations o
        where o.id = customer_email_logs.organization_id
          and o.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.organization_users ou
        where ou.organization_id = customer_email_logs.organization_id
          and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;
