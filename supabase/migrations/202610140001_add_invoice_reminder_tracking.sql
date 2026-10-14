-- Add reminder tracking columns to invoices table
alter table public.invoices
  add column if not exists last_reminder_sent_at timestamptz null,
  add column if not exists reminder_count int not null default 0;

create index if not exists idx_invoices_overdue_reminders
  on public.invoices (status, due_date, last_reminder_sent_at);

comment on column public.invoices.last_reminder_sent_at is 'Timestamp when the most recent reminder email was sent for this invoice.';
comment on column public.invoices.reminder_count is 'Total number of reminder emails dispatched for this invoice.';
