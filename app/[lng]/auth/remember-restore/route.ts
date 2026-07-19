import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { tryRestoreRememberedSession } from '@/lib/rememberMe';

function sanitizeNextPath(nextParam: string | null, locale: string) {
  if (!nextParam) {
    return `/${locale}/dashboard`;
  }

  if (!nextParam.startsWith('/')) {
    return `/${locale}/dashboard`;
  }

  if (nextParam.startsWith('//')) {
    return `/${locale}/dashboard`;
  }

  return nextParam;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const [, localeFromPath] = requestUrl.pathname.split('/');
  const locale = localeFromPath || 'en';
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get('next'), locale);

  const supabase = await createClient();
  const restored = await tryRestoreRememberedSession(supabase);

  if (restored) {
    return NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  }

  return NextResponse.redirect(new URL(`/${locale}/login?remembered=0`, request.url), { status: 303 });
}
