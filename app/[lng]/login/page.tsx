import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';

  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <LoginPageClient locale={locale} />
    </Suspense>
  );
}