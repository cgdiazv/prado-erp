'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { findHowToMatchesByLocale, type HowToPlaybook } from '@/lib/helpdeskHowTo';

type HelpdeskHowToAssistantProps = {
  locale: string;
};

function buildSuggestedReply(question: string, matches: HowToPlaybook[], isEs: boolean) {
  if (matches.length === 0) {
    return isEs
      ? [
          'Gracias por tu pregunta. Todavia no pude mapearla a una guia especifica.',
          'Comparte la pantalla exacta donde te atoras y la accion que esperabas para enviarte pasos precisos.',
        ].join('\n\n')
      : [
          'Thanks for your question. I could not map it to a specific playbook yet.',
          'Please share the exact screen where you are stuck and what action you expected, and I will send precise steps.',
        ].join('\n\n');
  }

  const top = matches[0];

  return isEs
    ? [
        `Gracias por escribir. Basado en tu pregunta: "${question.trim()}"`,
        top.quickReply,
        'Si quieres, tambien te puedo enviar capturas o guiarte paso a paso en tiempo real.',
      ].join('\n\n')
    : [
        `Thanks for reaching out. Based on your question: "${question.trim()}"`,
        top.quickReply,
        'If you want, I can also send screenshots or walk you through it step-by-step in real time.',
      ].join('\n\n');
}

export default function HelpdeskHowToAssistant({ locale }: HelpdeskHowToAssistantProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');

  const matches = useMemo(() => {
    const source = submittedQuestion || question;
    return findHowToMatchesByLocale(source, locale, 3);
  }, [question, submittedQuestion, locale]);

  const suggestedReply = useMemo(
    () => buildSuggestedReply(submittedQuestion || question, matches, isEs),
    [question, submittedQuestion, matches, isEs]
  );

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Helpdesk Answer Assistant</h2>
        <p className="text-sm text-slate-500">
          {isEs
            ? 'Escribe una pregunta de soporte y recibe guias relacionadas con una respuesta sugerida para enviar.'
            : 'Type a user how-to question and get quick playbook matches plus a ready-to-send response draft.'}
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedQuestion(question.trim());
        }}
        className="grid grid-cols-1 gap-3"
      >
        <label className="block text-xs text-slate-600 font-medium">
          {isEs ? 'Pregunta del usuario' : 'User question'}
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder={isEs ? 'Ejemplo: Como programo un trabajo y asigno un camion?' : 'Example: How do I schedule a job and assign a truck?'}
            required
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-800"
          >
            {isEs ? 'Sugerir respuesta' : 'Suggest response'}
          </button>
          <button
            type="button"
            onClick={() => {
              setQuestion('');
              setSubmittedQuestion('');
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {isEs ? 'Limpiar' : 'Clear'}
          </button>
          <Link
            href={`/${locale}/management/how-to`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isEs ? 'Abrir guias paso a paso' : 'Open How-To Screens'}
          </Link>
        </div>
      </form>

      {submittedQuestion ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">{isEs ? 'Borrador de respuesta sugerida' : 'Suggested reply draft'}</h3>
            <pre className="whitespace-pre-wrap text-xs text-slate-700 font-sans">{suggestedReply}</pre>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  void navigator.clipboard.writeText(suggestedReply);
                }
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              {isEs ? 'Copiar respuesta' : 'Copy reply'}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">{isEs ? 'Guias mas relevantes' : 'Top playbook matches'}</h3>
            {matches.length === 0 ? (
              <p className="text-xs text-slate-500">
                {isEs
                  ? 'No se encontro una guia directa. Prueba palabras clave como cliente, programar, estimacion, factura, importar, equipo o stripe.'
                  : 'No direct playbook match found. Try using keywords like customer, schedule, estimate, invoice, import, team, or stripe.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {matches.map((match) => (
                  <li key={match.slug} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-900">{match.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{match.summary}</p>
                    <Link
                      href={`/${locale}/management/how-to/${match.slug}`}
                      className="mt-2 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-600"
                    >
                      {isEs ? 'Abrir guia completa' : 'Open full how-to screen'}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
