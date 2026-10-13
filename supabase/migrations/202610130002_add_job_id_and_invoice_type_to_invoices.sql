-- Add job_id, invoice_type, and notes to invoices table
alter table public.invoices
  add column if not exists job_id uuid references public.jobs(id) on delete set null,
  add column if not exists invoice_type text not null default 'standard',
  add column if not exists notes text null;

create index if not exists idx_invoices_job_id on public.invoices (job_id);

comment on column public.invoices.job_id is 'Optional reference to the originating job for this invoice.';
comment on column public.invoices.invoice_type is 'Type of invoice: standard, deposit, or final.';
comment on column public.invoices.notes is 'Optional invoice notes, scope description, or terms.';
