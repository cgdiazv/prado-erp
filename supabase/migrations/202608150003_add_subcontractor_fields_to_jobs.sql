alter table public.jobs
  add column if not exists subcontractor_id uuid null,
  add column if not exists subcontractor_pay_amount numeric(10,2) null default 0.00;

create index if not exists idx_jobs_subcontractor_id on public.jobs (subcontractor_id);
