create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_first_name_length check (char_length(coalesce(first_name, '')) <= 80),
  constraint user_profiles_last_name_length check (char_length(coalesce(last_name, '')) <= 80),
  constraint user_profiles_phone_length check (char_length(coalesce(phone, '')) <= 50)
);

create or replace function public.set_user_profiles_updated_at()
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
    where tgname = 'trg_user_profiles_updated_at'
  ) then
    create trigger trg_user_profiles_updated_at
    before update on public.user_profiles
    for each row
    execute function public.set_user_profiles_updated_at();
  end if;
end;
$$;

alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_select_own'
  ) then
    create policy "user_profiles_select_own"
    on public.user_profiles
    for select
    using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_insert_own'
  ) then
    create policy "user_profiles_insert_own"
    on public.user_profiles
    for insert
    with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_update_own'
  ) then
    create policy "user_profiles_update_own"
    on public.user_profiles
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;
