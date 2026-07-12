import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseRawClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Standard client for authenticated user flows (Respects RLS)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method can be ignored if called from a Server Component
          }
        },
      },
    }
  );
}

// Admin client for post-signup pipeline (Bypasses RLS before email is confirmed)
export function createAdminClient() {
  return createSupabaseRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}