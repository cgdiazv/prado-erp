import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface UserAuthIndexRecord {
  user_id: string;
  email: string;
  last_sign_in_at: string | null;
  user_metadata: Record<string, any>;
}

export function normalizeAuthEmail(email: string) {
  return email.toLowerCase().trim();
}

export async function upsertAuthUserIndex(
  supabaseAdmin: SupabaseClient,
  user: {
    id: string;
    email?: string | null;
    last_sign_in_at?: string | null;
    user_metadata?: Record<string, any>;
  }
) {
  if (!user.id || !user.email) {
    return { error: 'Auth user is missing required id or email.' };
  }

  const { error } = await supabaseAdmin
    .from('user_auth_index')
    .upsert(
      [
        {
          user_id: user.id,
          email: normalizeAuthEmail(user.email),
          last_sign_in_at: user.last_sign_in_at || null,
          user_metadata: user.user_metadata || {},
        },
      ],
      { onConflict: 'user_id' }
    );

  return { error: error?.message || null };
}

export async function findAuthUserIndexByEmail(supabaseAdmin: SupabaseClient, email: string) {
  return supabaseAdmin
    .from('user_auth_index')
    .select('user_id, email, last_sign_in_at, user_metadata')
    .eq('email', normalizeAuthEmail(email))
    .maybeSingle();
}

export async function findAuthUserIndexByUserIds(supabaseAdmin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) {
    return { data: [] as UserAuthIndexRecord[], error: null };
  }

  return supabaseAdmin
    .from('user_auth_index')
    .select('user_id, email, last_sign_in_at, user_metadata')
    .in('user_id', userIds);
}
