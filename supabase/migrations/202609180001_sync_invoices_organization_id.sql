-- Sync invoice organization_id with customer organization_id where missing or misaligned
update public.invoices as invoices
set organization_id = customers.organization_id
from public.customers as customers
where customers.id = invoices.customer_id
  and customers.organization_id is not null
  and (invoices.organization_id is null or invoices.organization_id != customers.organization_id);
