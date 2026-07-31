create table if not exists public.organization_role_permissions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null,
  modules text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organization_role_permissions_pkey primary key (organization_id, role),
  constraint organization_role_permissions_role_check check (role in ('owner', 'manager', 'supervisor', 'dispatcher', 'billing')),
  constraint organization_role_permissions_modules_check check (
    modules <@ array['customers', 'estimates', 'jobs', 'dispatch', 'invoice', 'expenses', 'settings']::text[]
  )
);

alter table public.organization_role_permissions enable row level security;

create policy "organization_role_permissions_select_member_or_owner"
on public.organization_role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.organizations o
    where o.id = organization_role_permissions.organization_id
      and o.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = organization_role_permissions.organization_id
      and ou.user_id = auth.uid()
  )
);

create policy "organization_role_permissions_manage_owner_manager"
on public.organization_role_permissions
for all
to authenticated
using (
  exists (
    select 1
    from public.organizations o
    where o.id = organization_role_permissions.organization_id
      and o.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = organization_role_permissions.organization_id
      and ou.user_id = auth.uid()
      and lower(coalesce(ou.role, '')) in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.organizations o
    where o.id = organization_role_permissions.organization_id
      and o.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = organization_role_permissions.organization_id
      and ou.user_id = auth.uid()
      and lower(coalesce(ou.role, '')) in ('admin', 'manager')
  )
);