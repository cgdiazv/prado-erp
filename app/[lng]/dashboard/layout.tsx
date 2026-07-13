import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import BillingModal from '@/components/BillingModal';

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
  const { data: org } = await supabase
    .from('organizations')
    .select('id, subscription_status')
    .eq('owner_id', user.id)
    .single();

  // 3. ALWAYS return a valid React Element tree structure
  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* This renders your actual page content inside the dashboard path layout slots */}
      {children}
      
      {/* Global Client-Side Billing Overlay Layer */}
      <BillingModal userEmail={user.email || ''} orgId={org?.id || ''} />
    </div>
  );
}