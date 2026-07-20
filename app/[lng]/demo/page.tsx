'use client';

import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { InlineWidget } from 'react-calendly';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';
import { submitDemoRequest } from '@/app/actions';
import { getTranslations } from '@/lib/translations';

export default function LiveDemoPage() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'en';
  const translations = getTranslations(locale);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [userData, setUserData] = useState({ name: '', email: '' });

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const result = await submitDemoRequest(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setStatus('error');
      return;
    }

    setUserData({ name, email });
    form.reset();
    setStatus('success');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <PublicNavbar locale={locale} />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-12 w-full">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium backdrop-blur-xs">
            {translations.demo.badge}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {translations.demo.titleLine1} <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
              {status === 'success' ? 'Choose Your Time Slot' : translations.demo.titleLine2}
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            {status === 'success'
              ? 'Information secured! Select a live time below that works best for your production team scheduling.'
              : translations.demo.description}
          </p>
        </header>

        <section
          className={`bg-slate-900/20 border border-slate-900 rounded-2xl shadow-xl transition-all duration-300 ${
            status === 'success' ? 'p-0 overflow-hidden' : 'p-4 md:p-6'
          }`}
        >
          {status === 'success' ? (
            <InlineWidget
              url="https://calendly.com/pradosysjobs/30min"
              styles={{
                width: '100%',
                height: '650px',
              }}
              prefill={{
                email: userData.email,
                name: userData.name,
              }}
              pageSettings={{
                backgroundColor: '020617',
                hideEventTypeDetails: false,
                hideLandingPageDetails: true,
                primaryColor: '10b981',
                textColor: 'f8fafc',
              }}
            />
          ) : (
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              {status === 'error' ? (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-400 text-xs rounded-lg font-medium">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    {translations.demo.fullName}
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Jane Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    {translations.demo.businessEmail}
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="jane@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    {translations.demo.companyName}
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    required
                    placeholder="Acme Global Industries"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    {translations.demo.phoneNumber}
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      name="phoneCountryCode"
                      defaultValue="+1"
                      className="w-[42%] bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                    >
                      <option value="+1">US (+1)</option>
                      <option value="+1">CA (+1)</option>
                      <option value="+52">MX (+52)</option>
                      <option value="+44">GB (+44)</option>
                      <option value="+34">ES (+34)</option>
                      <option value="+33">FR (+33)</option>
                      <option value="+49">DE (+49)</option>
                      <option value="+55">BR (+55)</option>
                      <option value="+54">AR (+54)</option>
                      <option value="+57">CO (+57)</option>
                      <option value="+61">AU (+61)</option>
                      <option value="+91">IN (+91)</option>
                      <option value="+81">JP (+81)</option>
                      <option value="+82">KR (+82)</option>
                      <option value="+86">CN (+86)</option>
                      <option value="+971">AE (+971)</option>
                      <option value="+966">SA (+966)</option>
                      <option value="+27">ZA (+27)</option>
                    </select>
                    <input
                      type="text"
                      name="phone"
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onInput={(event) => {
                        const target = event.currentTarget;
                        target.value = target.value.replace(/\D/g, '');
                      }}
                      className="w-[58%] bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                    />
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                    Notes / Requirements
                  </label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="Crew size, targets..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-xl mt-4"
              >
                {status === 'loading' ? translations.demo.loadingButton : 'Verify Info & View Calendar'}
              </button>
            </form>
          )}
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}