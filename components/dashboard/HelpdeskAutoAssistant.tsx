'use client';

import { useMemo, useState } from 'react';
import { findHowToMatchesByLocale, getHowToPlaybooks, type HowToPlaybook } from '@/lib/helpdeskHowTo';

type HelpdeskAutoAssistantProps = {
  locale?: string;
};

function buildSubscriberReply(question: string, matches: HowToPlaybook[], isEs: boolean) {
  if (!question.trim()) return '';

  if (matches.length === 0) {
    return isEs
      ? 'Gracias por tu pregunta. No encontre una guia exacta todavia. Comparte la pantalla donde te atoras y el resultado esperado para enviarte pasos precisos.'
      : 'Thanks for your question. I could not find an exact guide yet. Share the screen where you are blocked and the expected result so I can send precise steps.';
  }

  const top = matches[0];

  return isEs
    ? `Gracias por tu pregunta.\n\n${top.quickReply}\n\nSi quieres, tambien te puedo guiar paso a paso en tiempo real.`
    : `Thanks for your question.\n\n${top.quickReply}\n\nIf you want, I can also guide you step-by-step in real time.`;
}

export default function HelpdeskAutoAssistant({ locale = 'en' }: HelpdeskAutoAssistantProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const playbooks = useMemo(() => getHowToPlaybooks(locale), [locale]);

  const matches = useMemo(() => {
    const source = submittedQuestion || question;
    return findHowToMatchesByLocale(source, locale, 4);
  }, [question, submittedQuestion, locale]);

  const suggestedReply = useMemo(
    () => buildSubscriberReply(submittedQuestion || question, matches, isEs),
    [question, submittedQuestion, matches, isEs]
  );

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          {isEs ? 'Asistente de ayuda automatica' : 'Auto Helpdesk Assistant'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isEs
            ? 'Escribe tu pregunta y te mostraremos las mejores guias con una respuesta sugerida.'
            : 'Type your question and we will suggest the best matching guides with a ready response.'}
        </p>

        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedQuestion(question.trim());
          }}
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            required
            placeholder={
              isEs
                ? 'Ejemplo: Como programo un trabajo y asigno un camion?'
                : 'Example: How do I schedule a job and assign a truck?'
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {isEs ? 'Buscar ayuda' : 'Find guidance'}
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
          </div>
        </form>
      </div>

      {submittedQuestion ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {isEs ? 'Respuesta sugerida' : 'Suggested response'}
            </h3>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700 font-sans">{suggestedReply}</pre>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  void navigator.clipboard.writeText(suggestedReply);
                }
              }}
              className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isEs ? 'Copiar respuesta' : 'Copy response'}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {isEs ? 'Guias mas relevantes' : 'Best matching guides'}
            </h3>
            {matches.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                {isEs
                  ? 'No encontramos una guia exacta. Prueba palabras clave como cliente, programar, estimacion, factura, importar o equipo.'
                  : 'No direct guide match found. Try keywords like customer, schedule, estimate, invoice, import, or team.'}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {matches.map((match) => (
                  <li key={match.slug} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-900">{match.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{match.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          {isEs ? 'Todas las guias practicas' : 'All How-To Guides'}
        </h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {playbooks.map((playbook) => (
            <article key={playbook.slug} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-900">{playbook.title}</p>
              <p className="mt-1 text-xs text-slate-600">{playbook.summary}</p>
              <ol className="mt-2 space-y-1 list-decimal list-inside text-xs text-slate-700">
                {playbook.steps.slice(0, 3).map((step, index) => (
                  <li key={`${playbook.slug}-${index}`}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
