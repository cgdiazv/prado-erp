-- Reset org-related RLS policies to a non-recursive baseline.
-- This resolves cases where old policies still reference each other and
-- can block reads (or trigger infinite recursion) for normal users.

alter table public.organization_users enable row level security;
alter table public.organizations enable row level security;

-- Drop all existing policies on organization_users.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_users'
  loop
    execute format('drop policy if exists %I on public.organization_users', p.policyname);
  end loop;
end;
$$;

-- Drop all existing policies on organizations.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
  loop
    execute format('drop policy if exists %I on public.organizations', p.policyname);
  end loop;
end;
$$;

-- Keep organization_users policy self-contained (no organizations reference)
-- so organizations can safely depend on organization_users without recursion.
create policy "organization_users_select_self_by_user_id"
on public.organization_users
for select
to authenticated
using (user_id = auth.uid());

-- Allow users to read organizations they own or belong to via membership table.
create policy "organizations_select_member_or_owner"
on public.organizations
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = organizations.id
      and ou.user_id = auth.uid()
  )
);
