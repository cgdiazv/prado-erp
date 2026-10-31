-- Store structured Quote line items (including private internal labor & material costs)
-- so internal COGS are preserved for editing and automated Expense Ledger logging upon Job completion.

alter table public.estimates
  add column if not exists line_items jsonb default null;

