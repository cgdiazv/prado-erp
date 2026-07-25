'use client';

import { useState } from 'react';

interface GeneralInternalTicketModalProps {
  locale: string;
  createTicketAction: (formData: FormData) => void | Promise<void>;
}

export default function GeneralInternalTicketModal({ locale, createTicketAction }: GeneralInternalTicketModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
      >
        {isEs ? 'Crear ticket general/interno' : 'Create General/Internal Ticket'}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{isEs ? 'Ticket general/interno' : 'General/Internal Ticket'}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {isEs
                    ? 'Usa este formulario para temas de plataforma, infraestructura, facturacion interna o tareas operativas no ligadas a un subscriber.'
                    : 'Use this form for platform, infra, internal billing-tooling, or operational tasks not tied to a specific subscriber.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={isEs ? 'Cerrar modal' : 'Close modal'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form action={createTicketAction} className="mt-5 space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="ticketScope" value="general" />
              <input type="hidden" name="organizationId" value="" />
              <input type="hidden" name="organizationName" value="Internal" />

              <label className="block text-xs text-slate-600 font-medium">
                {isEs ? 'Asunto' : 'Subject'}
                <input
                  type="text"
                  name="subject"
                  defaultValue={isEs ? 'Ticket interno de operaciones' : 'Internal operations ticket'}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <label className="block text-xs text-slate-600 font-medium">
                {isEs ? 'Descripcion' : 'Description'}
                <textarea
                  name="description"
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder={isEs ? 'Describe el impacto, sistemas afectados y accion esperada.' : 'Describe issue impact, affected systems, and expected next action.'}
                  required
                />
              </label>

              <label className="block text-xs text-slate-600 font-medium">
                {isEs ? 'Prioridad' : 'Priority'}
                <select
                  name="priority"
                  defaultValue="medium"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </label>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {isEs ? 'Crear ticket interno' : 'Create internal ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
