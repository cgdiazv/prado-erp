alter table public.organizations
  add column if not exists max_jobs_per_truck integer not null default 4;

alter table public.organizations
  drop constraint if exists organizations_max_jobs_per_truck_check;

alter table public.organizations
  add constraint organizations_max_jobs_per_truck_check
  check (max_jobs_per_truck between 1 and 100);
