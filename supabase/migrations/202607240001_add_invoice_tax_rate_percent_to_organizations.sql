alter table public.organizations
add column if not exists invoice_tax_rate_percent numeric(5,2) not null default 8.25;

comment on column public.organizations.invoice_tax_rate_percent is 'Default invoice tax rate percent used for completed-job invoice generation, e.g. 8.25';
