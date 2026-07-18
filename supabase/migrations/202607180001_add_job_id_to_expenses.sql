alter table public.expenses
  add column if not exists job_id uuid null;

alter table public.expenses
  drop constraint if exists expenses_job_id_fkey;

alter table public.expenses
  add constraint expenses_job_id_fkey
  foreign key (job_id)
  references public.jobs (id)
  on delete set null;

create index if not exists idx_expenses_job_id on public.expenses (job_id);
