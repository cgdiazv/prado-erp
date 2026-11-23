-- Consolidated idempotent migration for Operations Settings (Services, Labor, Materials) and Customer addresses

-- 1. Organizations: custom labor rates & custom materials catalog JSONB columns, plus default labor/markup columns
alter table public.organizations
  add column if not exists default_labor_rate numeric(10,2) not null default 95.00,
  add column if not exists default_labor_cost numeric(10,2) not null default 45.00,
  add column if not exists default_materials_markup numeric(6,2) not null default 30.00,
  add column if not exists default_night_labor_rate numeric(10,2) not null default 135.00,
  add column if not exists default_night_labor_cost numeric(10,2) not null default 65.00,
  add column if not exists default_holiday_emergency_labor_rate numeric(10,2) not null default 165.00,
  add column if not exists default_holiday_emergency_labor_cost numeric(10,2) not null default 75.00,
  add column if not exists custom_labor_rates jsonb not null default '[]'::jsonb,
  add column if not exists custom_materials_catalog jsonb not null default '[]'::jsonb;

comment on column public.organizations.custom_labor_rates is
  'User-defined custom labor rate tiers [{ id, name, description, hourlyCost, hourlyPrice }] configured in Operations Settings -> Labor.';

comment on column public.organizations.custom_materials_catalog is
  'Catalog materials and supplies [{ id, name, description, unitCost, markupPercent, archived }] configured in Operations Settings -> Materials.';

-- 2. Services: ensure detailed description, base_price, and recurring columns exist
alter table public.services
  add column if not exists description text,
  add column if not exists base_price numeric(10,2) not null default 0.00,
  add column if not exists is_recurring_default boolean not null default false,
  add column if not exists recurrence_interval_days integer,
  add column if not exists auto_charge_default boolean not null default false;

-- 3. Customers & Properties: ensure billing_address and optional property fields exist
alter table public.customers
  add column if not exists billing_address text;

alter table public.properties
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip_code text,
  add column if not exists service_notes text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
