alter table public.trucks
  add column if not exists assigned_driver_id uuid references auth.users(id) on delete set null,
  add column if not exists driver_name text null,
  add column if not exists driver_email text null;

create index if not exists idx_trucks_assigned_driver_id on public.trucks (assigned_driver_id);
