import { submitDashboardFeedback } from './actions';

type DashboardFeedbackStripProps = {
  locale: string;
};

const OPTIONS = {
  en: [
    {
      value: 'bad',
      label: 'Bad',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M8.5 16.25c.75-1.25 2-1.75 3.5-1.75s2.75.5 3.5 1.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
    {
      value: 'okay',
      label: 'Okay',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M9 15.5h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
    {
      value: 'good',
      label: 'Good',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M8.5 14.75c.75 1.25 2 2 3.5 2s2.75-.75 3.5-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
    {
      value: 'great',
      label: 'Great',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75 13.8 10l3.7.54-2.68 2.61.63 3.69L12 15.15l-3.45 1.7.63-3.69L6.5 10.54l3.7-.54L12 6.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
  ],
  es: [
    {
      value: 'bad',
      label: 'Mal',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M8.5 16.25c.75-1.25 2-1.75 3.5-1.75s2.75.5 3.5 1.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
    {
      value: 'okay',
      label: 'Regular',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M9 15.5h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
    {
      value: 'good',
      label: 'Bien',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M8.5 14.75c.75 1.25 2 2 3.5 2s2.75-.75 3.5-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
    {
      value: 'great',
      label: 'Excelente',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75 13.8 10l3.7.54-2.68 2.61.63 3.69L12 15.15l-3.45 1.7.63-3.69L6.5 10.54l3.7-.54L12 6.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18Z" />
        </svg>
      ),
    },
  ],
} as const;

export default function DashboardFeedbackStrip({ locale }: DashboardFeedbackStripProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const copy = isEs
    ? { title: '¿Cómo vamos?', subtitle: 'Tu opinión ayuda a mejorar.' }
    : { title: 'How are we doing?', subtitle: 'Your quick feedback helps us improve.' };

  const options = isEs ? OPTIONS.es : OPTIONS.en;

  return (
    <section className="mt-10 flex justify-center">
      <div className="inline-flex flex-col items-center gap-2">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{copy.title}</p>
        </div>

        <form action={submitDashboardFeedback} className="flex items-center gap-2">
          <input type="hidden" name="locale" value={locale} />
          {options.map((option) => (
            <button
              key={option.value}
              type="submit"
              name="rating"
              value={option.value}
              aria-label={option.label}
              title={option.label}
              className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {option.icon}
            </button>
          ))}
        </form>
      </div>
    </section>
  );
}