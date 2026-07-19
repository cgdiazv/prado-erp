import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';
import { createClient } from '@/lib/supabaseServer';
import { tryRestoreRememberedSession } from '@/lib/rememberMe';
import { redirect } from 'next/navigation';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const supabase = await createClient();

  await tryRestoreRememberedSession(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <LoginPageClient locale={locale} />
    </Suspense>
  );
}