alter table public.invoices
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_url text,
  add column if not exists stripe_payment_status text,
  add column if not exists paid_at timestamptz;

create index if not exists idx_invoices_stripe_checkout_session_id
  on public.invoices (stripe_checkout_session_id);
