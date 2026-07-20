alter table if exists public.leads
add column if not exists phone text;
