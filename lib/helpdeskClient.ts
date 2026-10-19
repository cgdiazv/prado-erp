import { createClient as createSupabaseRawClient } from '@supabase/supabase-js';

// Admin client for Helpdesk operations.
// Allows connecting to an external Helpdesk Supabase project (e.g. prado-sys),
// while falling back seamlessly to the primary ERP Supabase project if external
// environment variables are not yet configured.
export function createHelpdeskAdminClient() {
  const url =
    process.env.HELPDESK_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.HELPDESK_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Helpdesk Supabase credentials. Define HELPDESK_SUPABASE_URL & HELPDESK_SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createSupabaseRawClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
