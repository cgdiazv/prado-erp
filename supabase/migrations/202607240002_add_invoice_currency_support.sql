alter table public.organizations
add column if not exists invoice_currency_code text not null default 'USD';

alter table public.organizations
drop constraint if exists organizations_invoice_currency_code_check;

alter table public.organizations
add constraint organizations_invoice_currency_code_check
check (invoice_currency_code in ('USD', 'EUR'));

comment on column public.organizations.invoice_currency_code is 'Default invoice currency code (USD or EUR) for new invoices.';

alter table public.invoices
add column if not exists currency_code text not null default 'USD';

alter table public.invoices
drop constraint if exists invoices_currency_code_check;

alter table public.invoices
add constraint invoices_currency_code_check
check (currency_code in ('USD', 'EUR'));

comment on column public.invoices.currency_code is 'Currency used for this invoice total and tax amounts.';
