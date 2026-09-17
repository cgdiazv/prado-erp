'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCustomer } from '@/app/actions';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

interface DeleteCustomerModalProps {
  customerId: string;
  customerName: string;
  locale?: string;
  triggerClassName?: string;
}

export default function DeleteCustomerModal({
  customerId,
  customerName,
  locale = 'en',
  triggerClassName,
}: DeleteCustomerModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
    setError(null);
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteCustomer(customerId);

      if (res?.error) {
        setError(res.error);
        return;
      }

      setIsOpen(false);
      const destination = locale && locale !== 'en' ? `/${locale}/dashboard/customers` : '/dashboard/customers';
      router.push(destination);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          triggerClassName ||
          'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold py-1.5 px-3.5 rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-1.5'
        }
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
        <span>{isEs ? 'Eliminar perfil de cliente' : 'Delete Client Profile'}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isEs ? '¿Eliminar cliente permanentemente?' : 'Delete Customer Profile?'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isEs ? 'Esta acción no se puede deshacer' : 'This action cannot be undone'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl text-rose-900 space-y-1.5">
                <p className="font-semibold text-[13px] text-rose-800">
                  {isEs ? 'Advertencia de eliminación total:' : 'Warning: Complete Data Removal'}
                </p>
                <p>
                  {isEs ? (
                    <>
                      Al eliminar a <strong className="font-bold text-rose-950">{customerName}</strong>, se eliminarán
                      permanentemente todos sus registros vinculados:
                    </>
                  ) : (
                    <>
                      Deleting <strong className="font-bold text-rose-950">{customerName}</strong> will permanently remove
                      this customer along with all attached records:
                    </>
                  )}
                </p>
                <ul className="list-disc pl-5 pt-1 space-y-1 font-medium text-rose-900/90">
                  <li>{isEs ? 'Todas las Cotizaciones / Quotes asociadas' : 'All associated Quotes'}</li>
                  <li>{isEs ? 'Todas las Facturas / Invoices emitidas' : 'All issued Invoices'}</li>
                  <li>{isEs ? 'Sitios de servicio (propiedades) y trabajos vinculados' : 'Service sites and linked jobs'}</li>
                  <li>{isEs ? 'Historial de correos y actividades' : 'Email logs and activity history'}</li>
                </ul>
              </div>

              {error && (
                <div className="p-3 bg-red-100/80 border border-red-300 text-red-800 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEs ? 'Eliminando...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Eliminar cliente y registros' : 'Delete Customer & All Records'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
