alter table public.organizations
add column if not exists default_labor_rate numeric(10,2) not null default 95.00,
add column if not exists default_labor_cost numeric(10,2) not null default 45.00,
add column if not exists default_materials_markup numeric(6,2) not null default 30.00;

comment on column public.organizations.default_labor_rate is 'Standard billable labor rate per hour charged to customers.';
comment on column public.organizations.default_labor_cost is 'Internal hourly labor cost to the business (wages + overhead).';
comment on column public.organizations.default_materials_markup is 'Default markup percentage applied to materials and supplies cost.';
