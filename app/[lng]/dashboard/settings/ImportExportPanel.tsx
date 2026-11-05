'use client';

import { useState } from 'react';
import ImportCsvPanel from '@/components/dashboard/ImportCsvPanel';

export type ImportExportTabId = 'import' | 'export';

interface ImportExportPanelProps {
  locale?: string;
  initialTab?: string;
}

export default function ImportExportPanel({ locale = 'en', initialTab }: ImportExportPanelProps) {
  const isEs = locale.toLowerCase().startsWith('es');

  const normalizeInitialTab = (tab?: string): ImportExportTabId => {
    if (tab === 'export') return 'export';
    return 'import';
  };

  const [activeTab, setActiveTab] = useState<ImportExportTabId>(() => normalizeInitialTab(initialTab));

  const handleTabChange = (tabId: ImportExportTabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'import') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const tabs: Array<{ id: ImportExportTabId; label: string }> = [
    {
      id: 'import',
      label: isEs ? 'Importar' : 'Import',
    },
    {
      id: 'export',
      label: isEs ? 'Exportar' : 'Export',
    },
  ];

  const t = isEs
    ? {
        importTab: 'Importar',
        exportTab: 'Exportar',
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
        importTab: 'Import',
        exportTab: 'Export',
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
    <div className="space-y-4 min-w-0">
      {/* Horizontal Sub-tabs */}
      <div className="border-b border-slate-200">
        <nav
          className="flex items-center space-x-8 -mb-px overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={isEs ? 'Pestañas de importar y exportar' : 'Import and export sub-tabs'}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={`whitespace-nowrap pb-3 pt-1 px-1 text-sm transition-all border-b-[3px] cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Import Tab Panel */}
        <div
          id="tabpanel-import"
          role="tabpanel"
          aria-labelledby="tab-import"
          className={activeTab === 'import' ? 'block' : 'hidden'}
        >
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{t.importTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t.importDescription}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-slate-50/50 p-5 space-y-4">
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
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{t.templatesTitle}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <a
                  href="/api/import/template?entity=customers"
                  download
                  className="text-center text-xs font-semibold px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
                >
                  {t.templateCustomers}
                </a>
                <a
                  href="/api/import/template?entity=jobs"
                  download
                  className="text-center text-xs font-semibold px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
                >
                  {t.templateJobs}
                </a>
                <a
                  href="/api/import/template?entity=expenses"
                  download
                  className="text-center text-xs font-semibold px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
                >
                  {t.templateExpenses}
                </a>
                <a
                  href="/api/import/template?entity=estimates"
                  download
                  className="text-center text-xs font-semibold px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
                >
                  {t.templateEstimates}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Export Tab Panel */}
        <div
          id="tabpanel-export"
          role="tabpanel"
          aria-labelledby="tab-export"
          className={activeTab === 'export' ? 'block' : 'hidden'}
        >
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">{t.exportTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t.exportDescription}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <a
                href="/api/export/csv?entity=customers"
                download
                className="flex items-center justify-center gap-2 text-center text-xs font-semibold px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>{t.exportCustomers}</span>
              </a>
              <a
                href="/api/export/csv?entity=jobs"
                download
                className="flex items-center justify-center gap-2 text-center text-xs font-semibold px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>{t.exportJobs}</span>
              </a>
              <a
                href="/api/export/csv?entity=expenses"
                download
                className="flex items-center justify-center gap-2 text-center text-xs font-semibold px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-2xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>{t.exportExpenses}</span>
              </a>
              <a
                href="/api/export/csv?entity=estimates"
                download
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
    </div>
  );
}
