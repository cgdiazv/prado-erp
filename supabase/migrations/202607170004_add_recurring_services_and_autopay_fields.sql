alter table public.services
  add column if not exists is_recurring_default boolean default false,
  add column if not exists recurrence_interval_days integer,
  add column if not exists auto_charge_default boolean default false;

alter table public.jobs
  add column if not exists service_id uuid,
  add column if not exists is_recurring boolean default false,
  add column if not exists recurrence_interval_days integer,
  add column if not exists auto_charge_enabled boolean default false,
  add column if not exists recurring_source_job_id uuid;

alter table public.customers
  add column if not exists autopay_enabled boolean default false,
  add column if not exists autopay_enabled_at timestamptz,
  add column if not exists stripe_payment_customer_id text,
  add column if not exists stripe_default_payment_method_id text;

create index if not exists idx_jobs_service_id on public.jobs (service_id);
create index if not exists idx_jobs_recurring_source_job_id on public.jobs (recurring_source_job_id);
create index if not exists idx_customers_autopay_enabled on public.customers (autopay_enabled);
