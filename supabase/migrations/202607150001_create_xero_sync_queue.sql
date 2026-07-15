create table if not exists public.xero_sync_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_type text not null check (work_type in ('expense_bill', 'completed_job_invoice')),
  source_id text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'synced', 'failed')),
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  xero_document_id text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists xero_sync_queue_uniq_source
  on public.xero_sync_queue (organization_id, work_type, source_id);

create index if not exists xero_sync_queue_status_retry_idx
  on public.xero_sync_queue (status, next_retry_at, created_at);

create index if not exists xero_sync_queue_org_status_idx
  on public.xero_sync_queue (organization_id, status, created_at);

update public.xero_sync_queue
set next_retry_at = coalesce(next_retry_at, now())
where next_retry_at is null;

alter table public.xero_sync_queue
  alter column next_retry_at set default now();
