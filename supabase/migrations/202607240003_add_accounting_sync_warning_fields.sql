alter table public.organizations
add column if not exists last_qbo_sync_warning text,
add column if not exists last_qbo_sync_warning_at timestamptz,
add column if not exists last_xero_sync_warning text,
add column if not exists last_xero_sync_warning_at timestamptz;

comment on column public.organizations.last_qbo_sync_warning is 'Latest operator-facing QuickBooks sync warning for this organization.';
comment on column public.organizations.last_qbo_sync_warning_at is 'Timestamp of latest QuickBooks sync warning.';
comment on column public.organizations.last_xero_sync_warning is 'Latest operator-facing Xero sync warning for this organization.';
comment on column public.organizations.last_xero_sync_warning_at is 'Timestamp of latest Xero sync warning.';
