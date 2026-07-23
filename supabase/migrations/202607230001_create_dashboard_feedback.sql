create table if not exists public.dashboard_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  rating text not null check (rating in ('bad', 'okay', 'good', 'great')),
  rating_label text not null,
  locale text not null default 'en',
  source text not null default 'dashboard_footer',
  created_at timestamptz not null default now()
);

create index if not exists dashboard_feedback_organization_id_idx
  on public.dashboard_feedback(organization_id);

create index if not exists dashboard_feedback_created_at_idx
  on public.dashboard_feedback(created_at desc);

alter table public.dashboard_feedback enable row level security;