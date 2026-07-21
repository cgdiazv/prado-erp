'use client';

import { useState } from 'react';

interface DeleteAccountSurveyCardProps {
  locale?: string;
  actionPath: string;
  buttonLabel: string;
}

export default function DeleteAccountSurveyCard({
  locale = 'en',
  actionPath,
  buttonLabel,
}: DeleteAccountSurveyCardProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');

  const otherReasonOption = isEs ? 'Otro' : 'Other';
  const reasons = [
    isEs ? 'Ya no necesito la plataforma' : 'I no longer need the platform',
    isEs ? 'Muy costoso para mi negocio' : 'Too expensive for my business',
    isEs ? 'Faltan funciones importantes' : 'Missing important features',
    isEs ? 'Problemas tecnicos o errores' : 'Technical issues or bugs',
    isEs ? 'Cambio a otra plataforma' : 'Switching to another platform',
    isEs ? 'Preocupaciones de privacidad o seguridad' : 'Privacy or security concerns',
  ];

  const modalTitle = isEs ? 'Antes de eliminar tu cuenta' : 'Before deleting your account';
  const modalSubtitle = isEs
    ? 'Selecciona una o mas razones (opcional, pero util).'
    : 'Select one or more reasons (optional but helpful).';
  const otherReasonPlaceholder = isEs ? 'Cuentanos mas' : 'Tell us more';
  const closeModalLabel = isEs ? 'Cerrar modal de eliminacion de cuenta' : 'Close account deletion modal';
  const cancelButtonLabel = isEs ? 'Volver' : 'Go back';
  const deleteWithoutAnsweringLabel = isEs ? 'Eliminar sin responder' : 'Delete without answering';
  const deleteAndSendFeedbackLabel = isEs ? 'Eliminar y enviar comentarios' : 'Delete and send feedback';

  const hasOtherReasonSelected = selectedReasons.includes(otherReasonOption);
  const canSubmitReasons =
    selectedReasons.length > 0 &&
    (!hasOtherReasonSelected || otherReason.trim().length > 0);

  function toggleReason(reason: string) {
    setSelectedReasons((previous) => {
      if (previous.includes(reason)) {
        return previous.filter((item) => item !== reason);
      }
      return [...previous, reason];
    });
  }

  function buildReasonPayload() {
    if (hasOtherReasonSelected) {
      return selectedReasons
        .filter((reason) => reason !== otherReasonOption)
        .concat(`Other: ${otherReason.trim().slice(0, 500)}`);
    }

    return selectedReasons;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="text-xs font-semibold px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-300 transition"
      >
        {buttonLabel}
      </button>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">{modalTitle}</h4>
                <p className="mt-1 text-sm text-slate-500">{modalSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label={closeModalLabel}
              >
                x
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {reasons.map((reason) => (
                <label key={reason} className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasOtherReasonSelected}
                  onChange={() => toggleReason(otherReasonOption)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span>{otherReasonOption}</span>
              </label>

              {hasOtherReasonSelected ? (
                <textarea
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={otherReasonPlaceholder}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {cancelButtonLabel}
              </button>

              <form action={actionPath} method="POST" className="contents">
                <input type="hidden" name="surveyReasons" value="[]" />
                <button
                  type="submit"
                  className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  {deleteWithoutAnsweringLabel}
                </button>
              </form>

              <form action={actionPath} method="POST" className="contents">
                <input type="hidden" name="surveyReasons" value={JSON.stringify(buildReasonPayload())} />
                <button
                  type="submit"
                  disabled={!canSubmitReasons}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteAndSendFeedbackLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
