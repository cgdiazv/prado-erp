import { createClient as createSupabaseRawClient } from '@supabase/supabase-js';

// Admin client for server-side operations that require bypassing RLS.
// This client is safe to use in server-side code that might be bundled
// with client components (e.g., in utility files), as it doesn't depend
// on server-only APIs like `next/headers`.
export function createAdminClient() {
  return createSupabaseRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}