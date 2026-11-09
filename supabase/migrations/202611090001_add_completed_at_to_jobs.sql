alter table public.jobs
  add column if not exists completed_at timestamptz null;
