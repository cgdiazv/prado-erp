alter table public.organization_invitations
  drop constraint if exists organization_invitations_role_check;

alter table public.organization_invitations
  add constraint organization_invitations_role_check
  check (role in (
    'owner',
    'manager',
    'supervisor',
    'dispatcher',
    'billing',
    'subcontractor'
  ));

alter table public.organization_users
  drop constraint if exists organization_users_role_check;

alter table public.organization_users
  add constraint organization_users_role_check
  check (role in (
    'owner',
    'manager',
    'supervisor',
    'dispatcher',
    'billing',
    'subcontractor'
  ));

alter table public.organization_role_permissions
  drop constraint if exists organization_role_permissions_role_check;

alter table public.organization_role_permissions
  add constraint organization_role_permissions_role_check
  check (role in (
    'owner',
    'manager',
    'supervisor',
    'dispatcher',
    'billing',
    'subcontractor'
  ));
