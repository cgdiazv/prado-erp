alter table public.organization_invitations
  add column if not exists invite_token text;

update public.organization_invitations
  set invite_token = coalesce(invite_token, gen_random_uuid()::text)
  where accepted_at is null and invite_token is null;

create unique index if not exists organization_invitations_invite_token_key
  on public.organization_invitations (invite_token);
