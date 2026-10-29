-- Standalone Helpdesk schema migration (compatible with both external prado-sys Supabase
-- and primary prado-erp Supabase without cross-project FK dependencies).

create table if not exists public.helpdesk_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  requested_by_user_id uuid,
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
  unread_for_agent_count integer not null default 0,
  unread_for_user_count integer not null default 0,
  waiting_on text not null default 'none'
    check (waiting_on in ('agent', 'user', 'none')),
  last_comment_at timestamptz,
  last_comment_author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.helpdesk_ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.helpdesk_tickets(id) on delete cascade,
  author_user_id uuid,
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
  actor_user_id uuid,
  actor_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists helpdesk_tickets_organization_id_idx
  on public.helpdesk_tickets(organization_id);

create index if not exists helpdesk_tickets_status_idx
  on public.helpdesk_tickets(status);

create index if not exists helpdesk_tickets_waiting_on_idx
  on public.helpdesk_tickets(waiting_on);

create index if not exists helpdesk_tickets_unread_for_agent_idx
  on public.helpdesk_tickets(unread_for_agent_count);

create index if not exists helpdesk_tickets_last_comment_at_idx
  on public.helpdesk_tickets(last_comment_at desc nulls last);

create index if not exists helpdesk_ticket_comments_ticket_id_idx
  on public.helpdesk_ticket_comments(ticket_id);

create index if not exists helpdesk_ticket_events_ticket_id_idx
  on public.helpdesk_ticket_events(ticket_id);

alter table public.helpdesk_tickets enable row level security;
alter table public.helpdesk_ticket_comments enable row level security;
alter table public.helpdesk_ticket_events enable row level security;

