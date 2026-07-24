create extension if not exists pgcrypto;

create table if not exists public.facebook_page_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  page_id text not null unique,
  page_name text,
  page_access_token text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.messenger_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  page_id text not null,
  page_name text,
  customer_id uuid references public.customers (id) on delete set null,
  sender_psid text not null,
  sender_name text,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  assigned_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, page_id, sender_psid)
);

create table if not exists public.messenger_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.messenger_conversations (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  page_id text not null,
  sender_psid text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_text text,
  attachment_payload jsonb,
  external_message_id text unique,
  sent_at timestamptz not null default now(),
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_facebook_page_connections_org on public.facebook_page_connections (organization_id);
create index if not exists idx_messenger_conversations_org_last_message on public.messenger_conversations (organization_id, last_message_at desc nulls last);
create index if not exists idx_messenger_messages_conversation_sent_at on public.messenger_messages (conversation_id, sent_at asc);
create index if not exists idx_messenger_messages_org on public.messenger_messages (organization_id);

comment on table public.facebook_page_connections is 'Manual Meta Messenger Page connections per Prado organization.';
comment on table public.messenger_conversations is 'Messenger inbox threads scoped to an organization and Facebook Page.';
comment on table public.messenger_messages is 'Inbound and outbound Messenger messages stored for the internal inbox.';

alter table public.facebook_page_connections enable row level security;
alter table public.messenger_conversations enable row level security;
alter table public.messenger_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facebook_page_connections' and policyname = 'facebook_page_connections_select_org_members'
  ) then
    create policy "facebook_page_connections_select_org_members"
    on public.facebook_page_connections
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.organization_users ou
        where ou.organization_id = facebook_page_connections.organization_id
          and ou.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.organizations o
        where o.id = facebook_page_connections.organization_id
          and o.owner_id = auth.uid()
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messenger_conversations' and policyname = 'messenger_conversations_select_org_members'
  ) then
    create policy "messenger_conversations_select_org_members"
    on public.messenger_conversations
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.organization_users ou
        where ou.organization_id = messenger_conversations.organization_id
          and ou.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.organizations o
        where o.id = messenger_conversations.organization_id
          and o.owner_id = auth.uid()
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messenger_messages' and policyname = 'messenger_messages_select_org_members'
  ) then
    create policy "messenger_messages_select_org_members"
    on public.messenger_messages
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.organization_users ou
        where ou.organization_id = messenger_messages.organization_id
          and ou.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.organizations o
        where o.id = messenger_messages.organization_id
          and o.owner_id = auth.uid()
      )
    );
  end if;
end;
$$;
