create table if not exists public.auth_remember_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint auth_remember_tokens_hash_length check (length(token_hash) >= 32)
);

create index if not exists idx_auth_remember_tokens_user_id on public.auth_remember_tokens (user_id);
create index if not exists idx_auth_remember_tokens_expires_active on public.auth_remember_tokens (expires_at) where revoked_at is null;

create or replace function public.set_auth_remember_tokens_updated_at()
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
    where tgname = 'trg_auth_remember_tokens_updated_at'
  ) then
    create trigger trg_auth_remember_tokens_updated_at
    before update on public.auth_remember_tokens
    for each row
    execute function public.set_auth_remember_tokens_updated_at();
  end if;
end;
$$;

alter table public.auth_remember_tokens enable row level security;
