import { createClient as createSupabaseRawClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedResolvedClient: SupabaseClient | null = null;
let cachedResolvedAt = 0;
const RESOLVE_CACHE_TTL_MS = 60_000;

function createRawServiceClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createSupabaseRawClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isMissingHelpdeskTableError(
  error: { message?: string | null; code?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  const code = (error.code || '').toUpperCase();
  const message = (error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('helpdesk_tickets') &&
      (message.includes('schema cache') || message.includes('does not exist'))
  );
}

// Synchronous client factory kept for backwards compatibility.
export function createHelpdeskAdminClient(): SupabaseClient {
  if (cachedResolvedClient) {
    return cachedResolvedClient;
  }

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

  return createRawServiceClient(url, serviceRoleKey);
}

/**
 * Resolves a working Supabase admin client for Helpdesk operations.
 * Tries HELPDESK_SUPABASE_URL first (if configured), and if `public.helpdesk_tickets`
 * does not exist there, automatically falls back to the primary ERP Supabase project
 * (NEXT_PUBLIC_SUPABASE_URL).
 */
export async function getHelpdeskAdminClient(): Promise<{
  client: SupabaseClient;
  hasHelpdeskTables: boolean;
}> {
  const now = Date.now();
  if (cachedResolvedClient && now - cachedResolvedAt < RESOLVE_CACHE_TTL_MS) {
    return { client: cachedResolvedClient, hasHelpdeskTables: true };
  }

  const candidates: Array<{ url: string; key: string }> = [];

  if (process.env.HELPDESK_SUPABASE_URL && process.env.HELPDESK_SUPABASE_SERVICE_ROLE_KEY) {
    candidates.push({
      url: process.env.HELPDESK_SUPABASE_URL,
      key: process.env.HELPDESK_SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !candidates.some((c) => c.url === process.env.NEXT_PUBLIC_SUPABASE_URL)
  ) {
    candidates.push({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  if (candidates.length === 0) {
    throw new Error(
      'Missing Helpdesk Supabase credentials. Define HELPDESK_SUPABASE_URL & HELPDESK_SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  for (const candidate of candidates) {
    const client = createRawServiceClient(candidate.url, candidate.key);
    const { error } = await client.from('helpdesk_tickets').select('id').limit(1);
    if (!error) {
      cachedResolvedClient = client;
      cachedResolvedAt = now;
      return { client, hasHelpdeskTables: true };
    }
    if (!isMissingHelpdeskTableError(error)) {
      // Table exists, or another error occurred that isn't missing-table
      cachedResolvedClient = client;
      cachedResolvedAt = now;
      return { client, hasHelpdeskTables: true };
    }
  }

  // Fallback to the primary ERP client (or first candidate) when neither has helpdesk_tickets
  const fallback = candidates[candidates.length - 1];
  return {
    client: createRawServiceClient(fallback.url, fallback.key),
    hasHelpdeskTables: false,
  };
}
