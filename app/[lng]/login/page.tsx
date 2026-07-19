import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';
import { createClient } from '@/lib/supabaseServer';
import { REMEMBER_ME_COOKIE_NAME } from '@/lib/rememberMe';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const supabase = await createClient();
  const cookieStore = await cookies();
  const hasRememberCookie = cookieStore.has(REMEMBER_ME_COOKIE_NAME);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  if (hasRememberCookie) {
    redirect(`/${locale}/auth/remember-restore?next=${encodeURIComponent(`/${locale}/dashboard`)}`);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <LoginPageClient locale={locale} />
    </Suspense>
  );
}