create or replace function public.is_prado_management_email()
returns boolean
language sql
stable
as $$
  select split_part(lower(coalesce(auth.jwt() ->> 'email', '')), '@', 2) = 'pradojob.com';
$$;

alter table public.helpdesk_tickets enable row level security;
alter table public.helpdesk_ticket_comments enable row level security;
alter table public.helpdesk_ticket_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'helpdesk_tickets'
      and policyname = 'helpdesk_tickets_select_prado_management'
  ) then
    create policy "helpdesk_tickets_select_prado_management"
    on public.helpdesk_tickets
    for select
    to authenticated
    using (public.is_prado_management_email());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'helpdesk_ticket_comments'
      and policyname = 'helpdesk_ticket_comments_select_prado_management'
  ) then
    create policy "helpdesk_ticket_comments_select_prado_management"
    on public.helpdesk_ticket_comments
    for select
    to authenticated
    using (public.is_prado_management_email());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'helpdesk_ticket_events'
      and policyname = 'helpdesk_ticket_events_select_prado_management'
  ) then
    create policy "helpdesk_ticket_events_select_prado_management"
    on public.helpdesk_ticket_events
    for select
    to authenticated
    using (public.is_prado_management_email());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'helpdesk_tickets'
  ) then
    alter publication supabase_realtime add table public.helpdesk_tickets;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'helpdesk_ticket_comments'
  ) then
    alter publication supabase_realtime add table public.helpdesk_ticket_comments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'helpdesk_ticket_events'
  ) then
    alter publication supabase_realtime add table public.helpdesk_ticket_events;
  end if;
end;
$$;