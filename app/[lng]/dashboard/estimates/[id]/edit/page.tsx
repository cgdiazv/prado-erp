import { createClient } from '@/lib/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import { getEstimatesDashboardData, getEstimateForEdit } from '@/app/actions';
import { hasDashboardModuleAccess } from '@/lib/dashboardRolePermissions';
import { getUserOrganization } from '@/lib/organization';
import QuoteEditor from '../../QuoteEditor';

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ lng?: string; id: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const estimateId = resolvedParams.id;
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

  const [dashboardData, estimateResult] = await Promise.all([
    getEstimatesDashboardData(),
    getEstimateForEdit(estimateId),
  ]);

  if (!estimateResult.success || !estimateResult.estimate) {
    redirect(`/${locale}/dashboard/estimates`);
  }

  return (
    <QuoteEditor
      locale={locale}
      mode="edit"
      initialEstimate={estimateResult.estimate}
      initialProperties={estimateResult.customerProperties || []}
      customers={(dashboardData.customers as any[]) || []}
      services={(dashboardData.services as any[]) || []}
      defaultLaborRate={Number(dashboardData.defaultLaborRate ?? 95)}
      defaultLaborCost={Number(dashboardData.defaultLaborCost ?? 45)}
      defaultMaterialsMarkup={Number(dashboardData.defaultMaterialsMarkup ?? 30)}
      defaultPaymentTerms={dashboardData.defaultPaymentTerms || 'Due on Receipt'}
    />
  );
}
