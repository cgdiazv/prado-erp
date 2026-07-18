import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import BillingModal from '@/components/BillingModal';
import { DashboardNotificationProvider } from '@/components/dashboard/DashboardNotificationContext';
import { getUserOrganization } from '@/lib/organization';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  // 1. Fetch active authentication user context
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. Resolve the matching organization profile metrics
  const { organization: org } = await getUserOrganization(user.id);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, phone')
    .eq('user_id', user.id)
    .maybeSingle();

  const missingRequiredProfileField =
    !profile?.first_name?.trim() ||
    !profile?.last_name?.trim() ||
    !profile?.phone?.trim();
  const metadataRequiresCompletion =
    user.user_metadata?.needs_profile_completion === true &&
    user.user_metadata?.profile_completed !== true;
  const hasIncompleteProfile = metadataRequiresCompletion || missingRequiredProfileField;

  // 3. ALWAYS return a valid React Element tree structure
  return (
    <div className="relative min-h-screen bg-slate-50">
      <DashboardNotificationProvider hasIncompleteProfile={hasIncompleteProfile}>
        {/* This renders your actual page content inside the dashboard path layout slots */}
        {children}
      </DashboardNotificationProvider>
      
      {/* Global Client-Side Billing Overlay Layer */}
      <BillingModal userEmail={user.email || ''} orgId={org?.id || ''} />
    </div>
  );
}