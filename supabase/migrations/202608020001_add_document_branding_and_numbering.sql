alter table public.organizations
add column if not exists next_estimate_number integer not null default 1001,
add column if not exists next_invoice_number integer not null default 1001,
add column if not exists document_email_header_color text not null default '#009966';

alter table public.organizations
drop constraint if exists organizations_next_estimate_number_check;

alter table public.organizations
add constraint organizations_next_estimate_number_check
check (next_estimate_number >= 1);

alter table public.organizations
drop constraint if exists organizations_next_invoice_number_check;

alter table public.organizations
add constraint organizations_next_invoice_number_check
check (next_invoice_number >= 1);

alter table public.organizations
drop constraint if exists organizations_document_email_header_color_check;

alter table public.organizations
add constraint organizations_document_email_header_color_check
check (document_email_header_color ~ '^#[0-9A-Fa-f]{6}$');

comment on column public.organizations.next_estimate_number is 'Next sequential estimate number reserved for the workspace.';
comment on column public.organizations.next_invoice_number is 'Next sequential invoice number reserved for the workspace.';
comment on column public.organizations.document_email_header_color is 'Hex color used in estimate and invoice email headers.';

alter table public.estimates
add column if not exists estimate_number integer;

alter table public.invoices
add column if not exists organization_id uuid references public.organizations(id) on delete set null,
add column if not exists invoice_number integer;

with numbered_estimates as (
  select
    id,
    row_number() over (partition by organization_id order by created_at asc nulls first, id asc) + 1000 as next_number
  from public.estimates
  where organization_id is not null
)
update public.estimates as estimates
set estimate_number = numbered_estimates.next_number
from numbered_estimates
where estimates.id = numbered_estimates.id
  and estimates.estimate_number is null;

with numbered_invoices as (
  select
    invoices.id,
    coalesce(invoices.organization_id, customers.organization_id) as resolved_organization_id,
    row_number() over (
      partition by coalesce(invoices.organization_id, customers.organization_id)
      order by invoices.created_at asc nulls first, invoices.id asc
    ) + 1000 as next_number
  from public.invoices as invoices
  left join public.customers as customers
    on customers.id = invoices.customer_id
  where coalesce(invoices.organization_id, customers.organization_id) is not null
)
update public.invoices as invoices
set
  organization_id = coalesce(invoices.organization_id, numbered_invoices.resolved_organization_id),
  invoice_number = coalesce(invoices.invoice_number, numbered_invoices.next_number)
from numbered_invoices
where invoices.id = numbered_invoices.id;

create unique index if not exists estimates_organization_id_estimate_number_idx
on public.estimates (organization_id, estimate_number)
where estimate_number is not null;

create unique index if not exists invoices_organization_id_invoice_number_idx
on public.invoices (organization_id, invoice_number)
where invoice_number is not null;

update public.organizations as organizations
set
  next_estimate_number = greatest(
    coalesce((
      select max(estimates.estimate_number) + 1
      from public.estimates as estimates
      where estimates.organization_id = organizations.id
    ), 1001),
    coalesce(organizations.next_estimate_number, 1001)
  ),
  next_invoice_number = greatest(
    coalesce((
      select max(invoices.invoice_number) + 1
      from public.invoices as invoices
      where invoices.organization_id = organizations.id
    ), 1001),
    coalesce(organizations.next_invoice_number, 1001)
  ),
  document_email_header_color = coalesce(nullif(organizations.document_email_header_color, ''), '#009966');

create or replace function public.reserve_org_document_number(
  p_organization_id uuid,
  p_document_type text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_number integer;
begin
  if p_document_type = 'estimate' then
    update public.organizations
    set next_estimate_number = next_estimate_number + 1
    where id = p_organization_id
    returning next_estimate_number - 1 into reserved_number;
  elsif p_document_type = 'invoice' then
    update public.organizations
    set next_invoice_number = next_invoice_number + 1
    where id = p_organization_id
    returning next_invoice_number - 1 into reserved_number;
  else
    raise exception 'Unsupported document type: %', p_document_type;
  end if;

  if reserved_number is null then
    raise exception 'Organization % not found.', p_organization_id;
  end if;

  return reserved_number;
end;
$$;

grant execute on function public.reserve_org_document_number(uuid, text) to authenticated;
grant execute on function public.reserve_org_document_number(uuid, text) to service_role;