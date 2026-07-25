alter table public.helpdesk_tickets
  add column if not exists unread_for_agent_count integer not null default 0,
  add column if not exists unread_for_user_count integer not null default 0,
  add column if not exists waiting_on text not null default 'none'
    check (waiting_on in ('agent', 'user', 'none')),
  add column if not exists last_comment_at timestamptz,
  add column if not exists last_comment_author_email text;

create index if not exists helpdesk_tickets_waiting_on_idx
  on public.helpdesk_tickets(waiting_on);

create index if not exists helpdesk_tickets_unread_for_agent_idx
  on public.helpdesk_tickets(unread_for_agent_count);

create index if not exists helpdesk_tickets_last_comment_at_idx
  on public.helpdesk_tickets(last_comment_at desc nulls last);
