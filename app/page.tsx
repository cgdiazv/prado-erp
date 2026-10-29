import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { getUserOrganization } from '@/lib/organization';
import MarketingLandingPage from '@/components/marketing/MarketingLandingPage';

export default async function MarketingHomePage() {
  const supabase = await createClient();

  // 1. If already authenticated, fetch organization context to auto-route them in
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { organization: org } = await getUserOrganization(user.id);

    if (org) {
      redirect('/dashboard');
    } else {
      redirect('/en/auth/access-pending');
    }
  }

  return <MarketingLandingPage locale="en" />;
}