create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  organization_id uuid references public.organizations (id) on delete set null,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_event_type on public.audit_logs (event_type);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs (actor_user_id);
create index if not exists idx_audit_logs_org_id on public.audit_logs (organization_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_service_role_all'
  ) then
    create policy "audit_logs_service_role_all"
    on public.audit_logs
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end;
$$;
