alter table public.organizations
  add column if not exists auto_optimize_drive_routes boolean not null default true;
