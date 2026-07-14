import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import DashboardSidebar from '@/components/DashboardSidebar';

export default async function ImportExportPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  const t = isEs
    ? {
        title: 'Importar / Exportar',
        subtitle: 'Gestiona cargas y descargas de datos operativos para tu organización.',
        exportTitle: 'Exportar Datos',
        exportDescription:
          'Descarga la informacion de tu cuenta en formato CSV para respaldos, migraciones o analisis externo.',
        exportCustomers: 'Exportar Clientes',
        exportJobs: 'Exportar Jobs',
        exportExpenses: 'Exportar Gastos',
        exportEstimates: 'Exportar Cotizaciones',
        importTitle: 'Importar Datos',
        importDescription:
          'Sube archivos CSV para cargar informacion en bloque. Revisa el formato antes de importar.',
        uploadLabel: 'Archivo CSV',
        chooseFile: 'Seleccionar Archivo',
        importCustomers: 'Importar Clientes',
        importJobs: 'Importar Jobs',
        importExpenses: 'Importar Gastos',
        importEstimates: 'Importar Cotizaciones',
        soon: 'Proximamente: conectaremos estas acciones al pipeline de import/export.',
      }
    : {
        title: 'Import / Export',
        subtitle: 'Manage operational data uploads and downloads for your organization.',
        exportTitle: 'Export Data',
        exportDescription:
          'Download your workspace data in CSV format for backups, migration, or external analysis.',
        exportCustomers: 'Export Customers',
        exportJobs: 'Export Jobs',
        exportExpenses: 'Export Expenses',
        exportEstimates: 'Export Estimates',
        importTitle: 'Import Data',
        importDescription:
          'Upload CSV files to batch-load records. Review file format before importing.',
        uploadLabel: 'CSV File',
        chooseFile: 'Choose File',
        importCustomers: 'Import Customers',
        importJobs: 'Import Jobs',
        importExpenses: 'Import Expenses',
        importEstimates: 'Import Estimates',
        soon: 'Coming soon: these actions will be connected to the full import/export pipeline.',
      };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, logo_url, subscription_status')
    .eq('owner_id', user.id)
    .single();

  if (!org) {
    redirect('/signup');
  }

  const initial = org.name ? org.name.charAt(0) : 'C';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <DashboardNavbar userInitials={initial} organizationLogoUrl={org.logo_url || ''} />

      <div className="flex flex-1 relative">
        <DashboardSidebar subscriptionStatus={org.subscription_status} locale={locale} />

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-8 text-left">
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-400 mt-1">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.exportTitle}</h2>
                  <p className="text-xs text-slate-400 mt-1">{t.exportDescription}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                    {t.exportCustomers}
                  </button>
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                    {t.exportJobs}
                  </button>
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                    {t.exportExpenses}
                  </button>
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                    {t.exportEstimates}
                  </button>
                </div>
              </section>

              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.importTitle}</h2>
                  <p className="text-xs text-slate-400 mt-1">{t.importDescription}</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">{t.uploadLabel}</label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm bg-white outline-none file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                    {t.importCustomers}
                  </button>
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                    {t.importJobs}
                  </button>
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                    {t.importExpenses}
                  </button>
                  <button className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                    {t.importEstimates}
                  </button>
                </div>
              </section>
            </div>

            <p className="text-xs text-slate-500 italic">{t.soon}</p>
          </div>
        </main>
      </div>
    </div>
  );
}
