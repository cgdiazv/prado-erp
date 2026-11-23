-- Add custom_labor_rates JSONB array column to organizations for storing user-defined labor rate tiers
alter table public.organizations
  add column if not exists custom_labor_rates jsonb not null default '[]'::jsonb;
