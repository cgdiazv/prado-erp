'use client';

import ImportCsvPanel from '@/components/dashboard/ImportCsvPanel';

interface ImportExportPanelProps {
  locale?: string;
}

export default function ImportExportPanel({ locale = 'en' }: ImportExportPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const t = isEs
    ? {
        title: 'Importar / Exportar Datos',
        subtitle: 'Gestiona la carga masiva y descarga de datos operativos en formato CSV para tu organización.',
        importTitle: 'Importar Datos (CSV)',
        importDescription:
          'Sube archivos CSV para cargar información en bloque. Descarga las plantillas para verificar el formato.',
        uploadLabel: 'Archivo CSV',
        chooseFile: 'Seleccionar Archivo',
        noFileChosen: 'Ningún archivo seleccionado',
        importCustomers: 'Importar Clientes',
        importJobs: 'Importar Jobs',
        importExpenses: 'Importar Gastos',
        importEstimates: 'Importar Cotizaciones',
        noFileSelected: 'Selecciona un archivo CSV antes de importar.',
        importing: 'Importando...',
        importDone: 'Importación completada.',
        importFailed: 'La importación falló.',
        templatesTitle: 'Plantillas CSV de Importación',
        templateCustomers: 'Plantilla Clientes',
        templateJobs: 'Plantilla Jobs',
        templateExpenses: 'Plantilla Gastos',
        templateEstimates: 'Plantilla Cotizaciones',
        exportTitle: 'Exportar Datos (CSV)',
        exportDescription:
          'Descarga los registros actuales de tu cuenta en formato CSV para respaldos, migraciones o análisis externo.',
        exportCustomers: 'Exportar Clientes',
        exportJobs: 'Exportar Jobs',
        exportExpenses: 'Exportar Gastos',
        exportEstimates: 'Exportar Cotizaciones',
      }
    : {
        title: 'Data Import & Export',
        subtitle: 'Manage batch uploads and downloads of operational records in CSV format for your organization.',
        importTitle: 'Import Data (CSV)',
        importDescription:
          'Upload CSV files to batch-load records into your workspace. Download templates to ensure correct format.',
        uploadLabel: 'CSV File',
        chooseFile: 'Choose File',
        noFileChosen: 'No file chosen',
        importCustomers: 'Import Customers',
        importJobs: 'Import Jobs',
        importExpenses: 'Import Expenses',
        importEstimates: 'Import Quotes',
        noFileSelected: 'Please select a CSV file before importing.',
        importing: 'Importing...',
        importDone: 'Import completed.',
        importFailed: 'Import failed.',
        templatesTitle: 'Download CSV Templates',
        templateCustomers: 'Customers Template',
        templateJobs: 'Jobs Template',
        templateExpenses: 'Expenses Template',
        templateEstimates: 'Quotes Template',
        exportTitle: 'Export Data (CSV)',
        exportDescription:
          'Download your current records in CSV format for external reporting, accounting backups, or migration.',
        exportCustomers: 'Export Customers',
        exportJobs: 'Export Jobs',
        exportExpenses: 'Export Expenses',
        exportEstimates: 'Export Quotes',
      };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3m-4.5 6L12 4.5 16.5 9" />
          </svg>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.title}</h3>
        </div>
        <p className="text-xs text-slate-400">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="rounded-xl border border-gray-200 bg-slate-50/50 p-5 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">{t.importTitle}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{t.importDescription}</p>
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

          <div className="pt-3 border-t border-gray-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">{t.templatesTitle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="/api/import/template?entity=customers"
                className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                {t.templateCustomers}
              </a>
              <a
                href="/api/import/template?entity=jobs"
                className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                {t.templateJobs}
              </a>
              <a
                href="/api/import/template?entity=expenses"
                className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                {t.templateExpenses}
              </a>
              <a
                href="/api/import/template?entity=estimates"
                className="text-center text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                {t.templateEstimates}
              </a>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="rounded-xl border border-gray-200 bg-slate-50/50 p-5 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">{t.exportTitle}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{t.exportDescription}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href="/api/export/csv?entity=customers"
              className="flex items-center justify-center gap-2 text-center text-xs font-semibold px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>{t.exportCustomers}</span>
            </a>
            <a
              href="/api/export/csv?entity=jobs"
              className="flex items-center justify-center gap-2 text-center text-xs font-semibold px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>{t.exportJobs}</span>
            </a>
            <a
              href="/api/export/csv?entity=expenses"
              className="flex items-center justify-center gap-2 text-center text-xs font-semibold px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>{t.exportExpenses}</span>
            </a>
            <a
              href="/api/export/csv?entity=estimates"
              className="flex items-center justify-center gap-2 text-center text-xs font-semibold px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>{t.exportEstimates}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
