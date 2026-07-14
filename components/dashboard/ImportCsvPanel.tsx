'use client';

import { useMemo, useState } from 'react';

type ImportEntity = 'customers' | 'jobs' | 'expenses' | 'estimates';

interface ImportCsvPanelProps {
  uploadLabel: string;
  importCustomers: string;
  importJobs: string;
  importExpenses: string;
  importEstimates: string;
  noFileSelected: string;
  importing: string;
  importDone: string;
  importFailed: string;
}

export default function ImportCsvPanel({
  uploadLabel,
  importCustomers,
  importJobs,
  importExpenses,
  importEstimates,
  noFileSelected,
  importing,
  importDone,
  importFailed,
}: ImportCsvPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busyEntity, setBusyEntity] = useState<ImportEntity | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const buttons = useMemo(
    () => [
      { key: 'customers' as const, label: importCustomers },
      { key: 'jobs' as const, label: importJobs },
      { key: 'expenses' as const, label: importExpenses },
      { key: 'estimates' as const, label: importEstimates },
    ],
    [importCustomers, importJobs, importExpenses, importEstimates]
  );

  const runImport = async (entity: ImportEntity) => {
    setMessage('');
    setError('');

    if (!file) {
      setError(noFileSelected);
      return;
    }

    setBusyEntity(entity);

    try {
      const payload = new FormData();
      payload.set('entity', entity);
      payload.set('file', file);

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: payload,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error || importFailed);
        return;
      }

      const summary = `${importDone} ${result.imported}/${result.totalRows}.`;
      const errorsPreview = Array.isArray(result.errors) && result.errors.length
        ? ` ${result.errors.map((item: { row: number; reason: string }) => `R${item.row}: ${item.reason}`).join(' | ')}`
        : '';

      setMessage(`${summary}${errorsPreview}`.trim());
    } catch {
      setError(importFailed);
    } finally {
      setBusyEntity(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-500 uppercase">{uploadLabel}</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="w-full rounded-lg border border-gray-300 p-2 text-sm bg-white outline-none file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {buttons.map((button) => {
          const isBusy = busyEntity === button.key;
          return (
            <button
              key={button.key}
              type="button"
              disabled={!!busyEntity}
              onClick={() => runImport(button.key)}
              className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60"
            >
              {isBusy ? importing : button.label}
            </button>
          );
        })}
      </div>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </>
  );
}
