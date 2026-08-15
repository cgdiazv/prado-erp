-- Add default_payment_terms to organizations table
alter table public.organizations
add column if not exists default_payment_terms text not null default 'Due on Receipt';

comment on column public.organizations.default_payment_terms is 'Default payment terms assigned to new estimates and invoices (e.g. Due on Receipt, Net 15, Net 30, 50% Deposit).';

-- Add payment_terms to estimates table
alter table public.estimates
add column if not exists payment_terms text;

comment on column public.estimates.payment_terms is 'Specific payment terms agreed for this estimate.';
