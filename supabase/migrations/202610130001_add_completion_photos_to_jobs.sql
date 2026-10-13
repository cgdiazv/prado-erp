-- Add completion photos and notes to jobs table
alter table public.jobs
  add column if not exists completion_photos text[] null default '{}'::text[],
  add column if not exists completion_notes text null;
