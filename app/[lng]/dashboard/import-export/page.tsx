import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ImportCsvPanel from '@/components/dashboard/ImportCsvPanel';
import { getUserOrganization } from '@/lib/organization';

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
        subtitle: 'Gestiona cargas y descargas de datos operativos para tu organizacion.',
        exportTitle: 'Exportar Datos',
        exportDescription:
          'Descarga la informacion de tu cuenta en formato CSV para respaldos, migraciones o analisis externo.',
        exportCustomers: 'Exportar Clientes',
        exportJobs: 'Exportar Jobs',
        exportExpenses: 'Exportar Gastos',
        exportEstimates: 'Exportar Estimaciones',
        importTitle: 'Importar Datos',
        importDescription:
          'Sube archivos CSV para cargar informacion en bloque. Revisa el formato antes de importar.',
        uploadLabel: 'Archivo CSV',
        chooseFile: 'Seleccionar Archivo',
        noFileChosen: 'Ningun archivo seleccionado',
        importCustomers: 'Importar Clientes',
        importJobs: 'Importar Jobs',
        importExpenses: 'Importar Gastos',
        importEstimates: 'Importar Estimaciones',
        noFileSelected: 'Selecciona un archivo CSV antes de importar.',
        importing: 'Importando...',
        importDone: 'Importacion completada.',
        importFailed: 'La importacion fallo.',
        templatesTitle: 'Plantillas CSV',
        templateCustomers: 'Plantilla Clientes',
        templateJobs: 'Plantilla Jobs',
        templateExpenses: 'Plantilla Gastos',
        templateEstimates: 'Plantilla Estimaciones',
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
        noFileChosen: 'No file chosen',
        importCustomers: 'Import Customers',
        importJobs: 'Import Jobs',
        importExpenses: 'Import Expenses',
        importEstimates: 'Import Estimates',
        noFileSelected: 'Please select a CSV file before importing.',
        importing: 'Importing...',
        importDone: 'Import completed.',
        importFailed: 'Import failed.',
        templatesTitle: 'CSV Templates',
        templateCustomers: 'Customers Template',
        templateJobs: 'Jobs Template',
        templateExpenses: 'Expenses Template',
        templateEstimates: 'Estimates Template',
      };

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

  const normalizedRole = (role || '').toLowerCase();
  const canManageImportExport = normalizedRole === 'owner' || normalizedRole === 'admin';

  if (!canManageImportExport) {
    redirect(`/${locale}/dashboard`);
  }

  const initial = org.name ? org.name.charAt(0) : 'C';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans">
      <div className="flex flex-1 relative">

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-5xl ml-0 grid grid-cols-1 gap-8 text-left">
            <div className="flex flex-col gap-1 border-b border-gray-200 pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-400 mt-1">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.importTitle}</h2>
                  <p className="text-xs text-slate-400 mt-1">{t.importDescription}</p>
                </div>

                <ImportCsvPanel
                  uploadLabel={t.uploadLabel}
                  chooseFile={t.chooseFile}
                  noFileChosen={t.noFileChosen}
                  importCustomers={t.importCustomers}
                  importJobs={t.importJobs}
                  importExpenses={t.importExpenses}
                  importEstimates={t.importEstimates}
                  noFileSelected={t.noFileSelected}
                  importing={t.importing}
                  importDone={t.importDone}
                  importFailed={t.importFailed}
                />

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">{t.templatesTitle}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a href="/api/import/template?entity=customers" className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                      {t.templateCustomers}
                    </a>
                    <a href="/api/import/template?entity=jobs" className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                      {t.templateJobs}
                    </a>
                    <a href="/api/import/template?entity=expenses" className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                      {t.templateExpenses}
                    </a>
                    <a href="/api/import/template?entity=estimates" className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition">
                      {t.templateEstimates}
                    </a>
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.exportTitle}</h2>
                  <p className="text-xs text-slate-400 mt-1">{t.exportDescription}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="/api/export/csv?entity=customers"
                    className="text-center text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition"
                  >
                    {t.exportCustomers}
                  </a>
                  <a
                    href="/api/export/csv?entity=jobs"
                    className="text-center text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition"
                  >
                    {t.exportJobs}
                  </a>
                  <a
                    href="/api/export/csv?entity=expenses"
                    className="text-center text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition"
                  >
                    {t.exportExpenses}
                  </a>
                  <a
                    href="/api/export/csv?entity=estimates"
                    className="text-center text-xs font-semibold px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 transition"
                  >
                    {t.exportEstimates}
                  </a>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
