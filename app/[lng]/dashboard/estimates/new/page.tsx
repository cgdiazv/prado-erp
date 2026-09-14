import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { getEstimatesDashboardData } from '@/app/actions';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { getUserOrganization } from '@/lib/organization';
import QuoteEditor from '../QuoteEditor';

export default async function NewQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ customerId?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
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

  const dashboardData = await getEstimatesDashboardData();

  return (
    <QuoteEditor
      locale={locale}
      mode="create"
      customers={(dashboardData.customers as any[]) || []}
      services={(dashboardData.services as any[]) || []}
      defaultLaborRate={Number(dashboardData.defaultLaborRate ?? 95)}
      defaultLaborCost={Number(dashboardData.defaultLaborCost ?? 45)}
      defaultMaterialsMarkup={Number(dashboardData.defaultMaterialsMarkup ?? 30)}
      defaultPaymentTerms={dashboardData.defaultPaymentTerms || 'Due on Receipt'}
      preselectedCustomerId={resolvedSearchParams.customerId}
    />
  );
}
