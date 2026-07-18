-- Grant organization members read access to core operational tables used by dashboards.
-- These policies are additive (OR with existing select policies) and only affect SELECT.

-- Customers
alter table public.customers enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers' and policyname = 'customers_select_member_or_owner'
  ) then
    create policy "customers_select_member_or_owner"
    on public.customers
    for select
    to authenticated
    using (
      exists (
        select 1 from public.organizations o
        where o.id = customers.organization_id and o.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.organization_users ou
        where ou.organization_id = customers.organization_id and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Services
alter table public.services enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'services_select_member_or_owner'
  ) then
    create policy "services_select_member_or_owner"
    on public.services
    for select
    to authenticated
    using (
      exists (
        select 1 from public.organizations o
        where o.id = services.organization_id and o.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.organization_users ou
        where ou.organization_id = services.organization_id and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Expenses
alter table public.expenses enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'expenses' and policyname = 'expenses_select_member_or_owner'
  ) then
    create policy "expenses_select_member_or_owner"
    on public.expenses
    for select
    to authenticated
    using (
      exists (
        select 1 from public.organizations o
        where o.id = expenses.organization_id and o.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.organization_users ou
        where ou.organization_id = expenses.organization_id and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Estimates
alter table public.estimates enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'estimates' and policyname = 'estimates_select_member_or_owner'
  ) then
    create policy "estimates_select_member_or_owner"
    on public.estimates
    for select
    to authenticated
    using (
      exists (
        select 1 from public.organizations o
        where o.id = estimates.organization_id and o.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.organization_users ou
        where ou.organization_id = estimates.organization_id and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Trucks
alter table public.trucks enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trucks' and policyname = 'trucks_select_member_or_owner'
  ) then
    create policy "trucks_select_member_or_owner"
    on public.trucks
    for select
    to authenticated
    using (
      exists (
        select 1 from public.organizations o
        where o.id = trucks.organization_id and o.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.organization_users ou
        where ou.organization_id = trucks.organization_id and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Properties (organization through customers)
alter table public.properties enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'properties' and policyname = 'properties_select_member_or_owner'
  ) then
    create policy "properties_select_member_or_owner"
    on public.properties
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.customers c
        join public.organizations o on o.id = c.organization_id
        where c.id = properties.customer_id
          and o.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.customers c
        join public.organization_users ou on ou.organization_id = c.organization_id
        where c.id = properties.customer_id
          and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Invoices (organization through customers)
alter table public.invoices enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_select_member_or_owner'
  ) then
    create policy "invoices_select_member_or_owner"
    on public.invoices
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.customers c
        join public.organizations o on o.id = c.organization_id
        where c.id = invoices.customer_id
          and o.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.customers c
        join public.organization_users ou on ou.organization_id = c.organization_id
        where c.id = invoices.customer_id
          and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Jobs (organization through properties -> customers)
alter table public.jobs enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'jobs' and policyname = 'jobs_select_member_or_owner'
  ) then
    create policy "jobs_select_member_or_owner"
    on public.jobs
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.properties p
        join public.customers c on c.id = p.customer_id
        join public.organizations o on o.id = c.organization_id
        where p.id = jobs.property_id
          and o.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.properties p
        join public.customers c on c.id = p.customer_id
        join public.organization_users ou on ou.organization_id = c.organization_id
        where p.id = jobs.property_id
          and ou.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

-- Leads (if table exists and uses organization_id)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'organization_id'
  ) then
    execute 'alter table public.leads enable row level security';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'leads' and policyname = 'leads_select_member_or_owner'
    ) then
      execute '
        create policy "leads_select_member_or_owner"
        on public.leads
        for select
        to authenticated
        using (
          exists (
            select 1 from public.organizations o
            where o.id = leads.organization_id and o.owner_id = auth.uid()
          )
          or exists (
            select 1 from public.organization_users ou
            where ou.organization_id = leads.organization_id and ou.user_id = auth.uid()
          )
        )
      ';
    end if;
  end if;
end;
$$;
