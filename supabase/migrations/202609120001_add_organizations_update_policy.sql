-- Allow owners and admins to update their organizations
create policy "organizations_update_owner_or_admin"
on public.organizations
for update
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = organizations.id
      and ou.user_id = auth.uid()
      and ou.role in ('owner', 'admin')
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = organizations.id
      and ou.user_id = auth.uid()
      and ou.role in ('owner', 'admin')
  )
);
