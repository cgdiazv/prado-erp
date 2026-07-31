import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import {
  getEstimatesDashboardData,
} from '@/app/actions';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { getUserOrganization } from '@/lib/organization';
import EstimatesClient from './EstimatesClient';

export default async function EstimatesPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const canAccessEstimates = await hasDashboardModuleAccess(org.id, role, 'estimates');
  if (!canAccessEstimates) {
    redirect(`/${locale}/dashboard`);
  }

  // Preload data on the server
  const initialData = await getEstimatesDashboardData();

  return (
    <EstimatesClient initialData={initialData} />
  );
}