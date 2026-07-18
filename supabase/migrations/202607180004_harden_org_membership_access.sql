-- Remove duplicate memberships so org resolution remains deterministic.
with duplicate_memberships as (
  select
    ctid,
    row_number() over (
      partition by organization_id, user_id
      order by ctid
    ) as rn
  from public.organization_users
  where user_id is not null
)
delete from public.organization_users ou
using duplicate_memberships d
where ou.ctid = d.ctid
  and d.rn > 1;

-- Enforce one membership row per organization/user pair.
create unique index if not exists organization_users_org_user_unique
  on public.organization_users (organization_id, user_id)
  where user_id is not null;

-- Ensure authenticated members can read their own membership row.
alter table public.organization_users enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_users'
      and policyname = 'organization_users_select_self_by_user_id'
  ) then
    create policy "organization_users_select_self_by_user_id"
    on public.organization_users
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;
end;
$$;

-- Ensure authenticated members can read their organization row.
alter table public.organizations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_select_member_or_owner'
  ) then
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
  end if;
end;
$$;
