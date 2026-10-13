'use client'; // This tells Next.js this file runs in the browser

import { archiveJob, restoreJob } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';

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

  const title = isArchived
    ? (isEs ? 'Restaurar trabajo' : 'Restore Job')
    : (isEs ? 'Archivar trabajo' : 'Archive Job');

  return (
    <button 
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      title={title}
      aria-label={title}
      className={`w-7 h-7 inline-flex items-center justify-center rounded-md border transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
        isArchived
          ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300'
          : 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300'
      }`}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isArchived ? (
        <RotateCcw className="w-3.5 h-3.5" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}