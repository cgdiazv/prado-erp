import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { getUserOrganization } from '@/lib/organization';
import { REMEMBER_ME_COOKIE_NAME } from '@/lib/rememberMe';
import { cookies } from 'next/headers';
import MarketingLandingPage from '@/components/marketing/MarketingLandingPage';

export default async function MarketingHomePage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const hasRememberCookie = cookieStore.has(REMEMBER_ME_COOKIE_NAME);

  // 1. If already authenticated, fetch organization context to auto-route them in
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { organization: org } = await getUserOrganization(user.id);

    if (org) {
      redirect(`/${lng}/dashboard`);
    } else {
      redirect(`/${lng}/auth/access-pending`);
    }
  }

  if (hasRememberCookie) {
    redirect(`/${lng}/auth/remember-restore?next=${encodeURIComponent(`/${lng}/dashboard`)}`);
  }

  // 2. Render the new Figma-exact marketing landing page
  return <MarketingLandingPage locale={lng} />;
}

