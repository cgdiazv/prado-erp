'use client';

import { useState } from 'react';
import { submitSupportTicket } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

interface SupportTicketFormProps {
  locale?: string;
  theme?: 'dark' | 'light';
}

export default function SupportTicketForm({ locale = 'en', theme = 'light' }: SupportTicketFormProps) {
  const translations = getTranslations(locale);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isDark = theme === 'dark';

  const panelClassName = isDark
    ? 'bg-slate-900/20 border border-slate-900 rounded-2xl p-6 md:p-8 shadow-xl'
    : 'bg-white border border-gray-200 rounded-2xl p-6 shadow-sm';
  const titleClassName = isDark ? 'text-lg font-bold text-white tracking-tight mb-1' : 'text-lg font-bold text-slate-900 tracking-tight mb-1';
  const descriptionClassName = isDark ? 'text-xs text-slate-400 mb-6 font-medium' : 'text-xs text-slate-500 mb-6 font-medium';
  const successClassName = isDark
    ? 'p-6 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl font-semibold text-center leading-relaxed'
    : 'p-6 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold text-center leading-relaxed';
  const errorClassName = isDark
    ? 'p-3 bg-rose-950/40 border border-rose-800/60 text-rose-400 text-xs rounded-lg font-medium'
    : 'p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium';
  const labelClassName = isDark
    ? 'block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider'
    : 'block text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider';
  const inputClassName = isDark
    ? 'w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium'
    : 'w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium';
  const selectClassName = isDark
    ? 'w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium cursor-pointer'
    : 'w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium cursor-pointer';
  const textareaClassName = isDark
    ? 'w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium resize-none leading-relaxed'
    : 'w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium resize-none leading-relaxed';
  const buttonClassName = isDark
    ? 'w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-xl mt-2 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500'
    : 'w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-sm mt-2 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className={panelClassName}>
      <h2 className={titleClassName}>{translations.support.formTitle}</h2>
      <p className={descriptionClassName}>{translations.support.formDescription}</p>

      {formStatus === 'success' ? (
        <div className={successClassName}>{translations.support.successMessage}</div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setFormStatus('loading');
            setErrorMessage('');

            const data = new FormData(event.currentTarget);
            const result = await submitSupportTicket(data);

            if (result?.error) {
              setErrorMessage(result.error);
              setFormStatus('error');
              return;
            }

            setFormStatus('success');
          }}
          className="space-y-4"
        >
          {formStatus === 'error' ? (
            <div className={errorClassName}>✕ {errorMessage || translations.support.errorFallback}</div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>{translations.support.nameLabel}</label>
              <input type="text" name="name" required placeholder="Jane Doe" className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Email</label>
              <input type="email" name="email" required placeholder="jane@organization.com" className={inputClassName} />
            </div>
          </div>

          <div>
            <label className={labelClassName}>{translations.support.urgencyLabel}</label>
            <select name="urgency" required className={selectClassName}>
              <option value="low">{translations.support.urgencyLow}</option>
              <option value="medium">{translations.support.urgencyMedium}</option>
              <option value="high">{translations.support.urgencyHigh}</option>
            </select>
          </div>

          <div>
            <label className={labelClassName}>{translations.support.messageLabel}</label>
            <textarea
              name="message"
              required
              rows={5}
              placeholder={translations.support.messagePlaceholder}
              className={textareaClassName}
            />
          </div>

          <button type="submit" disabled={formStatus === 'loading'} className={buttonClassName}>
            {formStatus === 'loading' ? translations.support.loadingButton : translations.support.submitButton}
          </button>
        </form>
      )}
    </div>
  );
}