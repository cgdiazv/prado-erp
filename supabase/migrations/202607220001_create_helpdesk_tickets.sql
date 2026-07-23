create table if not exists public.helpdesk_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  requested_by_email text,
  subject text not null,
  description text not null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'blocked', 'resolved', 'closed')),
  assignee_name text,
  assignee_email text,
  escalated_from text not null default 'management_console',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.helpdesk_ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.helpdesk_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_email text,
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.helpdesk_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.helpdesk_tickets(id) on delete cascade,
  event_type text not null
    check (event_type in ('escalated', 'updated', 'comment', 'status_changed', 'assigned')),
  event_note text,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists helpdesk_tickets_organization_id_idx
  on public.helpdesk_tickets(organization_id);

create index if not exists helpdesk_tickets_status_idx
  on public.helpdesk_tickets(status);

create index if not exists helpdesk_ticket_comments_ticket_id_idx
  on public.helpdesk_ticket_comments(ticket_id);

create index if not exists helpdesk_ticket_events_ticket_id_idx
  on public.helpdesk_ticket_events(ticket_id);

create or replace function public.set_helpdesk_ticket_updated_at()
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
    where tgname = 'trg_helpdesk_tickets_updated_at'
  ) then
    create trigger trg_helpdesk_tickets_updated_at
    before update on public.helpdesk_tickets
    for each row
    execute function public.set_helpdesk_ticket_updated_at();
  end if;
end;
$$;

alter table public.helpdesk_tickets enable row level security;
alter table public.helpdesk_ticket_comments enable row level security;
alter table public.helpdesk_ticket_events enable row level security;
