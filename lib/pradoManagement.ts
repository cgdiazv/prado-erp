import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabaseServer';

const DEFAULT_MANAGEMENT_DOMAINS = ['pradojob.com', 'indevasa.com'];

function parseCsvSet(value: string | undefined): Set<string> {
  return new Set(
    String(value || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function hasTruthyFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1;
}

export function isPradoManagementUser(user: Pick<User, 'email' | 'app_metadata' | 'user_metadata'>): boolean {
  const email = (user.email || '').trim().toLowerCase();
  if (!email.includes('@')) return false;

  const managementEmails = parseCsvSet(process.env.PRADO_MANAGEMENT_EMAILS);
  const managementDomains = parseCsvSet(process.env.PRADO_MANAGEMENT_DOMAINS);
  for (const defaultDomain of DEFAULT_MANAGEMENT_DOMAINS) {
    managementDomains.add(defaultDomain);
  }

  const domain = email.split('@')[1] || '';

  const metadataFlags = [
    user.app_metadata?.prado_management,
    user.app_metadata?.is_prado_management,
    user.user_metadata?.prado_management,
    user.user_metadata?.is_prado_management,
  ];

  if (metadataFlags.some(hasTruthyFlag)) {
    return true;
  }

  if (managementEmails.has(email)) {
    return true;
  }

  if (managementDomains.has(domain)) {
    return true;
  }

  return false;
}

export async function requirePradoManagementUser(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (!isPradoManagementUser(user)) {
    redirect(`/${locale}/dashboard`);
  }

  return user;
}
