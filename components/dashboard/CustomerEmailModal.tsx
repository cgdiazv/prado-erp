'use client';

import { useMemo, useState } from 'react';
import { sendCustomerDirectEmail } from '@/app/actions';

type CustomerEmailModalProps = {
  locale?: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  context?: 'customers_table' | 'customer_profile';
  className?: string;
};

export default function CustomerEmailModal({
  locale = 'en',
  customerId,
  customerEmail,
  customerName,
  context = 'customers_table',
  className,
}: CustomerEmailModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const defaultSubject = useMemo(() => {
    if (isEs) {
      return context === 'customer_profile'
        ? `Actualizacion de servicio para ${customerName}`
        : `Seguimiento para ${customerName}`;
    }

    return context === 'customer_profile'
      ? `Service update for ${customerName}`
      : `Follow-up for ${customerName}`;
  }, [context, customerName, isEs]);

  const defaultMessage = useMemo(() => {
    if (isEs) {
      return `Hola ${customerName},\n\n`; 
    }

    return `Hi ${customerName},\n\n`;
  }, [customerName, isEs]);

  function openModal() {
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setError(null);
    setSuccess(null);
    setIsOpen(true);
  }

  function closeModal() {
    if (isSending) return;
    setIsOpen(false);
  }

  async function handleSend() {
    if (!subject.trim() || !message.trim()) {
      setError(isEs ? 'Asunto y mensaje son requeridos.' : 'Subject and message are required.');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    const result = await sendCustomerDirectEmail({
      customerId,
      subject: subject.trim(),
      message: message.trim(),
      locale,
      context,
    });

    setIsSending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setSuccess(isEs ? 'Correo enviado correctamente.' : 'Email sent successfully.');
    setTimeout(() => {
      setIsOpen(false);
    }, 700);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={className || 'text-emerald-600 hover:text-emerald-700 hover:underline'}
      >
        {customerEmail}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {isEs ? 'Enviar correo' : 'Send Email'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{customerName} · {customerEmail}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-800 text-xl leading-none"
                aria-label={isEs ? 'Cerrar modal' : 'Close modal'}
              >
                ×
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">{error}</div>
              ) : null}
              {success ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs font-medium text-emerald-700">{success}</div>
              ) : null}

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
                  {isEs ? 'Asunto' : 'Subject'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
                  {isEs ? 'Mensaje' : 'Message'}
                </label>
                <textarea
                  rows={8}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="w-full resize-y rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSending}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSending ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Enviar' : 'Send')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
