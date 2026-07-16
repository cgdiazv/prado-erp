alter table public.organization_users
  drop constraint if exists organization_users_role_check;

alter table public.organization_users
  add constraint organization_users_role_check
  check (role in (
    'owner',
    'admin',
    'member',
    'supervisor',
    'manager',
    'accountant',
    'viewer',
    'guest'
  ));
