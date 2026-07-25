import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabaseServer';

const MANAGEMENT_DOMAIN = 'pradojob.com';

export function isPradoManagementUser(user: Pick<User, 'email' | 'app_metadata' | 'user_metadata'>): boolean {
  const email = (user.email || '').trim().toLowerCase();
  if (!email.includes('@')) return false;
  const domain = email.split('@')[1] || '';

  return domain === MANAGEMENT_DOMAIN;
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
