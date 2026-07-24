import { createAdminClient } from '@/lib/supabaseServer';

export type AccountingWarningSource = 'qbo' | 'xero';

const COLUMN_MAP: Record<AccountingWarningSource, { message: string; at: string }> = {
  qbo: {
    message: 'last_qbo_sync_warning',
    at: 'last_qbo_sync_warning_at',
  },
  xero: {
    message: 'last_xero_sync_warning',
    at: 'last_xero_sync_warning_at',
  },
};

export async function setAccountingSyncWarning(
  organizationId: string,
  source: AccountingWarningSource,
  message: string
) {
  const supabase = createAdminClient();
  const columns = COLUMN_MAP[source];

  const { error } = await supabase
    .from('organizations')
    .update({
      [columns.message]: message.slice(0, 500),
      [columns.at]: new Date().toISOString(),
    })
    .eq('id', organizationId);

  if (error) {
    console.error(`Failed to persist ${source} sync warning:`, error.message);
  }
}

export async function clearAccountingSyncWarning(
  organizationId: string,
  source: AccountingWarningSource
) {
  const supabase = createAdminClient();
  const columns = COLUMN_MAP[source];

  const { error } = await supabase
    .from('organizations')
    .update({
      [columns.message]: null,
      [columns.at]: null,
    })
    .eq('id', organizationId);

  if (error) {
    console.error(`Failed to clear ${source} sync warning:`, error.message);
  }
}
