import { getEstimatesDashboardData } from '@/app/actions';
import EstimatesContent from './EstimatesContent';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';

interface EstimatesLoaderProps {
  locale: string;
}

export default async function EstimatesLoader({ locale }: EstimatesLoaderProps) {
  // Preload data on the server
  const initialData = await getEstimatesDashboardData();

  const subscriptionStatus = initialData?.subscriptionStatus || 'trial';
  const canViewImportExport = initialData?.canViewImportExport === true;
  const organizationLogoUrl = initialData?.organizationLogoUrl || '';
  const organizationName = initialData?.organizationName || '';
  const userInitials = organizationName ? organizationName.charAt(0).toUpperCase() : 'C';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={userInitials} />
      <div className="flex flex-1 relative">
        <DashboardSidebar
          subscriptionStatus={subscriptionStatus}
          locale={locale}
          canViewImportExport={canViewImportExport}
        />
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <EstimatesContent
            subscriptionStatus={subscriptionStatus}
            organizationLogoUrl={organizationLogoUrl}
            userInitials={userInitials}
            initialData={initialData}
          />
        </main>
      </div>
    </div>
  );
}
