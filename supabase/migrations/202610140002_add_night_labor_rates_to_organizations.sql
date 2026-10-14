alter table public.organizations
add column if not exists default_night_labor_rate numeric(10,2) not null default 135.00,
add column if not exists default_night_labor_cost numeric(10,2) not null default 65.00,
add column if not exists default_holiday_emergency_labor_rate numeric(10,2) not null default 165.00,
add column if not exists default_holiday_emergency_labor_cost numeric(10,2) not null default 75.00;

comment on column public.organizations.default_night_labor_rate is 'Standard billable labor rate per hour charged to customers for night hours.';
comment on column public.organizations.default_night_labor_cost is 'Internal hourly labor cost to the business for night hours (wages + overhead).';
comment on column public.organizations.default_holiday_emergency_labor_rate is 'Standard billable labor rate per hour charged to customers for holidays and emergency jobs.';
comment on column public.organizations.default_holiday_emergency_labor_cost is 'Internal hourly labor cost to the business for holidays and emergency jobs (wages + overhead).';
