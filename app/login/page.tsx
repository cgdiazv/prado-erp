import { Suspense } from 'react';
import LoginPageClient from '@/app/login/LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}