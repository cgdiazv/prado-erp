create table if not exists public.user_auth_index (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  last_sign_in_at timestamptz,
  user_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_auth_index_email_format check (position('@' in email) > 1)
);

create unique index if not exists idx_user_auth_index_email on public.user_auth_index (email);

create or replace function public.set_user_auth_index_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_user_auth_index_updated_at'
  ) then
    create trigger trg_user_auth_index_updated_at
    before update on public.user_auth_index
    for each row
    execute function public.set_user_auth_index_updated_at();
  end if;
end;
$$;

alter table public.user_auth_index enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_auth_index'
      and policyname = 'user_auth_index_select_own'
  ) then
    create policy "user_auth_index_select_own"
    on public.user_auth_index
    for select
    using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_auth_index'
      and policyname = 'user_auth_index_insert_own'
  ) then
    create policy "user_auth_index_insert_own"
    on public.user_auth_index
    for insert
    with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_auth_index'
      and policyname = 'user_auth_index_update_own'
  ) then
    create policy "user_auth_index_update_own"
    on public.user_auth_index
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;
