-- Add route_order column to jobs table to persist stop order for vehicle routes
alter table public.jobs
  add column if not exists route_order integer null;

create index if not exists idx_jobs_truck_route_order
  on public.jobs (truck_id, route_order);
