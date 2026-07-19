import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabaseServer';

export const REMEMBER_ME_COOKIE_NAME = 'prado_remember';
const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type RememberTokenRow = {
  token_hash: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

function hashRememberToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function generateRememberToken() {
  return randomBytes(32).toString('base64url');
}

function getRememberCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

async function revokeRememberTokenByRawValue(rawToken: string | undefined) {
  if (!rawToken) {
    return;
  }

  const supabaseAdmin = createAdminClient();
  const tokenHash = hashRememberToken(rawToken);

  await supabaseAdmin
    .from('auth_remember_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('revoked_at', null);
}

export async function issueRememberToken(params: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  remember: boolean;
}) {
  const cookieStore = await cookies();

  if (!params.remember) {
    const existingToken = cookieStore.get(REMEMBER_ME_COOKIE_NAME)?.value;
    await revokeRememberTokenByRawValue(existingToken);
    cookieStore.delete(REMEMBER_ME_COOKIE_NAME);
    return;
  }

  const rawToken = generateRememberToken();
  const tokenHash = hashRememberToken(rawToken);
  const expiresAt = new Date(Date.now() + REMEMBER_ME_MAX_AGE_SECONDS * 1000).toISOString();

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from('auth_remember_tokens').insert({
    token_hash: tokenHash,
    user_id: params.userId,
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
    expires_at: expiresAt,
    last_used_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to store remember token: ${error.message}`);
  }

  cookieStore.set(
    REMEMBER_ME_COOKIE_NAME,
    rawToken,
    getRememberCookieOptions(REMEMBER_ME_MAX_AGE_SECONDS)
  );
}

export async function clearRememberToken() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(REMEMBER_ME_COOKIE_NAME)?.value;
  await revokeRememberTokenByRawValue(existingToken);
  cookieStore.delete(REMEMBER_ME_COOKIE_NAME);
}

export async function revokeOtherRememberTokensForUser(userId: string) {
  const cookieStore = await cookies();
  const currentRawToken = cookieStore.get(REMEMBER_ME_COOKIE_NAME)?.value;
  const currentTokenHash = currentRawToken ? hashRememberToken(currentRawToken) : null;
  const nowIso = new Date().toISOString();
  const supabaseAdmin = createAdminClient();

  const updateQuery = supabaseAdmin
    .from('auth_remember_tokens')
    .update({ revoked_at: nowIso })
    .eq('user_id', userId)
    .is('revoked_at', null);

  const { error } = currentTokenHash
    ? await updateQuery.neq('token_hash', currentTokenHash)
    : await updateQuery;

  if (error) {
    throw new Error(`Failed to revoke other remember tokens: ${error.message}`);
  }
}

export async function revokeAllRememberTokensForUser(userId: string) {
  const nowIso = new Date().toISOString();
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('auth_remember_tokens')
    .update({ revoked_at: nowIso })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) {
    throw new Error(`Failed to revoke remember tokens: ${error.message}`);
  }
}

export async function tryRestoreRememberedSession(supabase: SupabaseClient) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(REMEMBER_ME_COOKIE_NAME)?.value;

  if (!rawToken) {
    return false;
  }

  const tokenHash = hashRememberToken(rawToken);
  const nowIso = new Date().toISOString();
  const supabaseAdmin = createAdminClient();

  const { data: rememberToken, error: rememberLookupError } = await supabaseAdmin
    .from('auth_remember_tokens')
    .select('token_hash, user_id, access_token, refresh_token, expires_at')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle<RememberTokenRow>();

  if (rememberLookupError || !rememberToken) {
    cookieStore.delete(REMEMBER_ME_COOKIE_NAME);
    return false;
  }

  if (rememberToken.expires_at <= nowIso) {
    await supabaseAdmin
      .from('auth_remember_tokens')
      .update({ revoked_at: nowIso })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null);

    cookieStore.delete(REMEMBER_ME_COOKIE_NAME);
    return false;
  }

  const { data: restoredSession, error: restoreError } = await supabase.auth.setSession({
    access_token: rememberToken.access_token,
    refresh_token: rememberToken.refresh_token,
  });

  if (restoreError || !restoredSession.session) {
    await supabaseAdmin
      .from('auth_remember_tokens')
      .update({ revoked_at: nowIso })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null);

    cookieStore.delete(REMEMBER_ME_COOKIE_NAME);
    return false;
  }

  const rotatedRawToken = generateRememberToken();
  const rotatedTokenHash = hashRememberToken(rotatedRawToken);
  const rotatedExpiresAt = new Date(Date.now() + REMEMBER_ME_MAX_AGE_SECONDS * 1000).toISOString();

  const { error: rotateError } = await supabaseAdmin
    .from('auth_remember_tokens')
    .update({
      token_hash: rotatedTokenHash,
      access_token: restoredSession.session.access_token,
      refresh_token: restoredSession.session.refresh_token,
      expires_at: rotatedExpiresAt,
      last_used_at: nowIso,
      revoked_at: null,
    })
    .eq('token_hash', tokenHash);

  if (rotateError) {
    await supabaseAdmin
      .from('auth_remember_tokens')
      .update({ revoked_at: nowIso })
      .eq('token_hash', tokenHash);

    cookieStore.delete(REMEMBER_ME_COOKIE_NAME);
    return false;
  }

  cookieStore.set(
    REMEMBER_ME_COOKIE_NAME,
    rotatedRawToken,
    getRememberCookieOptions(REMEMBER_ME_MAX_AGE_SECONDS)
  );

  return true;
}
