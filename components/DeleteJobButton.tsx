'use client'; // This tells Next.js this file runs in the browser

import { archiveJob, restoreJob } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function DeleteJobButton({ jobId, jobStatus, locale = 'en' }: { jobId: string; jobStatus: string; locale?: string }) {
  const isEs = locale.toLowerCase().startsWith('es');
  const isArchived = jobStatus === 'archived';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmMessage = isArchived
      ? (isEs ? '¿Seguro que quieres restaurar este trabajo?' : 'Are you sure you want to restore this job?')
      : (isEs ? '¿Seguro que quieres archivar este trabajo?' : 'Are you sure you want to archive this job?');

    if (window.confirm(confirmMessage)) {
      startTransition(async () => {
        const result = isArchived ? await restoreJob(jobId) : await archiveJob(jobId);

        if (result?.error) {
          window.alert(result.error);
          return;
        }

        router.refresh();
      });
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      title={isArchived ? (isEs ? 'Restaurar trabajo' : 'Restore Job') : (isEs ? 'Archivar trabajo' : 'Archive Job')}
      className={`p-1.5 ${isArchived ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200' : 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border-rose-200'} rounded-lg transition duration-200 border shadow-xs ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isArchived ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h12m0 0-4-4m4 4-4 4M3 6h12a2 2 0 012 2v2M3 6v12a2 2 0 002 2h7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.34 9m-4.78 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      )}
    </button>
  );
}