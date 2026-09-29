'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import Footer from '@/components/Footer';
import { registerLiveMeetingAttendee } from '@/app/actions';

export default function LiveMeetingPage() {
  const params = useParams<{ lng?: string }>();
  const locale = params?.lng ?? 'es';
  const isEs = !locale || locale.toLowerCase().startsWith('es');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredName, setRegisteredName] = useState('');

  // Target event date: Monday, October 5th, 7:00 PM Central Time (2026-10-05T19:00:00-05:00)
  const eventDate = new Date('2026-10-05T19:00:00-05:00');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calculateTime() {
      const now = new Date().getTime();
      const difference = eventDate.getTime() - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append('locale', locale);
    const name = (formData.get('name') as string) || '';

    const result = await registerLiveMeetingAttendee(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setStatus('error');
      return;
    }

    setRegisteredName(name);
    setStatus('success');
  }

  // Google Calendar URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    'Prado Jobs - Live Meeting: Control Total de tu Operación en Campo'
  )}&dates=20261006T000000Z%2F20261006T004500Z&details=${encodeURIComponent(
    'Sesión práctica en vivo de 45 minutos con Prado Jobs: cómo generar cotizaciones en segundos, optimizar despacho y rutas en el mapa, y cobrar al terminar el trabajo.\n\nTransmisión: YouTube Live\nMás información: https://www.pradojob.com/live-meeting'
  )}&location=${encodeURIComponent('YouTube Live (Enlace enviado por correo)')}`;

  // Download .ics for Apple / Outlook
  function downloadIcs() {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Prado Jobs//Live Meeting//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:live-meeting-oct-5-2026@pradojob.com',
      'DTSTAMP:20260929T000000Z',
      'DTSTART:20261006T000000Z',
      'DTEND:20261006T004500Z',
      'SUMMARY:Prado Jobs - Live Meeting: Control Total de tu Operación en Campo',
      'DESCRIPTION:Sesión en vivo de 45 min: Cotizaciones en segundos\\, despacho y rutas eficientes en el mapa\\, cobros inmediatos y Q&A en tiempo real.',
      'LOCATION:YouTube Live',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'prado-jobs-live-meeting.ics';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <PublicNavbar locale={locale} theme="dark" />

      <main className="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 py-12 md:py-20 space-y-16">
        
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-full px-4 py-1.5 text-xs text-emerald-300 font-semibold backdrop-blur-md shadow-lg shadow-emerald-950/50">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute" />
            <span className="ml-1 tracking-wide uppercase font-bold text-[11px]">
              {isEs ? 'Sesión en Vivo Online · Acceso Gratuito' : 'Live Online Session · Free Access'}
            </span>
          </div>

          {/* Main Title Hook */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight md:leading-[1.15]">
            {isEs ? (
              <>
                ¿Cansado de perder horas en la noche{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                  cuadrando facturas, persiguiendo pagos
                </span>{' '}
                o llamando técnicos para saber por dónde andan?
              </>
            ) : (
              <>
                Tired of spending nights{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                  balancing invoices, chasing payments
                </span>{' '}
                or calling techs to see where they are?
              </>
            )}
          </h1>

          {/* Subtext description */}
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            {isEs ? (
              <>
                Este <strong className="text-white font-semibold">lunes 5 de octubre a las 7:00 PM CT (Hora Centro US)</strong> estaré transmitiendo en vivo para mostrarte paso a paso cómo simplificar y tomar el control total de tu operación con <strong className="text-emerald-400 font-semibold">Prado Jobs</strong>.
              </>
            ) : (
              <>
                This <strong className="text-white font-semibold">Monday, October 5th at 7:00 PM CT (US Central Time)</strong> I will be streaming live to show you step-by-step how to streamline and take full control of your operation with <strong className="text-emerald-400 font-semibold">Prado Jobs</strong>.
              </>
            )}
          </p>

          {/* Countdown Clock */}
          <div className="pt-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              {isEs ? 'La transmisión comienza en:' : 'Live broadcast begins in:'}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{timeLeft.days}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{isEs ? 'Días' : 'Days'}</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{timeLeft.hours}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{isEs ? 'Horas' : 'Hours'}</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{timeLeft.minutes}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{isEs ? 'Min' : 'Min'}</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">{timeLeft.seconds}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">{isEs ? 'Seg' : 'Sec'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Content Layout: Left = Agenda & Details, Right = Registration Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Agenda & Event Metadata */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Quick Metadata Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center shrink-0 text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isEs ? 'Fecha' : 'Date'}</h4>
                  <p className="text-sm font-semibold text-white">{isEs ? 'Lunes, 5 de octubre' : 'Monday, October 5th'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center shrink-0 text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isEs ? 'Hora' : 'Time'}</h4>
                  <p className="text-sm font-semibold text-white">7:00 PM CT (Hora Centro US)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center shrink-0 text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isEs ? 'Lugar' : 'Location'}</h4>
                  <p className="text-sm font-semibold text-white">{isEs ? 'Transmisión en vivo por YouTube' : 'YouTube Live Stream'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center shrink-0 text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isEs ? 'Duración' : 'Duration'}</h4>
                  <p className="text-sm font-semibold text-white">{isEs ? '45 min prácticos + Q&A' : '45 min practical + Q&A'}</p>
                </div>
              </div>
            </div>

            {/* Agenda Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span className="text-emerald-400">⚡</span>
                {isEs ? 'En esta sesión práctica de 45 minutos veremos en tiempo real:' : 'In this 45-minute practical session, we will see in real time:'}
              </h3>

              <div className="space-y-4 pt-1">
                {/* Point 1 */}
                <div className="flex items-start gap-3.5 bg-slate-950/50 border border-slate-800/60 p-3.5 rounded-xl">
                  <span className="text-2xl shrink-0">📄</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {isEs ? 'Cotizaciones en segundos' : 'Quotes in seconds'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {isEs
                        ? 'Cómo generar presupuestos formales desde el teléfono antes de subirte a la camioneta y enviarlos con aprobación digital inmediata.'
                        : 'How to create formal quotes directly from your mobile before getting in the vehicle, with instant customer approval.'}
                    </p>
                  </div>
                </div>

                {/* Point 2 */}
                <div className="flex items-start gap-3.5 bg-slate-950/50 border border-slate-800/60 p-3.5 rounded-xl">
                  <span className="text-2xl shrink-0">🗺️</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {isEs ? 'Despacho y rutas eficientes' : 'Efficient dispatch & routing'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {isEs
                        ? 'Cómo organizar el día de tus técnicos en el mapa con Google Maps para ahorrar gasolina, reducir tiempos de traslado y evitar paradas vacías.'
                        : 'How to organize technician days on Google Maps to save fuel, reduce travel times, and optimize stop sequences.'}
                    </p>
                  </div>
                </div>

                {/* Point 3 */}
                <div className="flex items-start gap-3.5 bg-slate-950/50 border border-slate-800/60 p-3.5 rounded-xl">
                  <span className="text-2xl shrink-0">💳</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {isEs ? 'Cobros inmediatos y términos de pago' : 'Instant payments & payment terms'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {isEs
                        ? 'Cómo facturar al momento de terminar el trabajo y aplicar condiciones claras (Due Upon Receipt, Net 15, Net 30) para cobrar más rápido.'
                        : 'How to invoice as soon as the job is completed and apply clear conditions (Due Upon Receipt, Net 15, Net 30) to get paid faster.'}
                    </p>
                  </div>
                </div>

                {/* Point 4 */}
                <div className="flex items-start gap-3.5 bg-slate-950/50 border border-slate-800/60 p-3.5 rounded-xl">
                  <span className="text-2xl shrink-0">⚙️</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {isEs ? 'Preguntas y respuestas en vivo' : 'Live Q&A session'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {isEs
                        ? 'Resolveré dudas de configuración y operación directamente sobre el panel de control en tiempo real.'
                        : 'I will resolve setup questions and workflows directly on the live dashboard in real time.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Audience Notice */}
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-5 text-emerald-200/90 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
              <span className="text-emerald-400 text-lg shrink-0">💡</span>
              <p>
                {isEs ? (
                  <>
                    <strong className="text-white font-semibold">¿Para quién es esta sesión?</strong> Si tienes un negocio de servicios en campo (plomería, HVAC, jardinería, electricidad, limpieza o contratistas independientes) y quieres pasar de las hojas de cálculo y notas en papel a un flujo ágil y profesional, esta sesión es 100% para ti.
                  </>
                ) : (
                  <>
                    <strong className="text-white font-semibold">Who is this for?</strong> If you run a field service business (plumbing, HVAC, lawn care, electrical, cleaning, or independent contracting) and want to move from spreadsheets and paper to a streamlined, professional workflow, this session is for you.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right Column: Registration / Subscription Card */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-emerald-500/5 backdrop-blur-md space-y-6">
              
              {status === 'success' ? (
                /* Success State */
                <div className="space-y-6 text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 text-2xl">
                    ✓
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">
                      {isEs ? `¡Lugar reservado, ${registeredName || 'amigo'}!` : `Spot reserved, ${registeredName || 'friend'}!`}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isEs
                        ? 'Te hemos registrado con éxito. Te enviaremos el enlace directo de YouTube y un recordatorio antes de iniciar la transmisión.'
                        : "You're all set! We will send you the direct YouTube link and a reminder before the broadcast starts."}
                    </p>
                  </div>

                  {/* Add to Calendar Buttons */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {isEs ? 'Guarda el recordatorio en tu calendario:' : 'Save to your calendar:'}
                    </p>
                    <a
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2.5 px-4 text-xs font-semibold border border-slate-700 transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                      </svg>
                      {isEs ? 'Agregar a Google Calendar' : 'Add to Google Calendar'}
                    </a>

                    <button
                      type="button"
                      onClick={downloadIcs}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 rounded-xl py-2.5 px-4 text-xs font-semibold border border-slate-700/60 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {isEs ? 'Descargar evento (.ics para Apple / Outlook)' : 'Download .ics (Apple / Outlook)'}
                    </button>
                  </div>

                  {/* Free Trial CTA */}
                  <div className="border-t border-slate-800 pt-5 space-y-3">
                    <p className="text-xs text-slate-400">
                      {isEs ? '¿Quieres ir probando la plataforma hoy?' : 'Want to explore the platform today?'}
                    </p>
                    <Link
                      href={`/${locale}/signup`}
                      className="inline-block w-full text-center bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl py-2.5 px-4 text-xs shadow-lg transition"
                    >
                      {isEs ? 'Comenzar prueba gratuita de 30 días' : 'Start 30-day Free Trial'}
                    </Link>
                  </div>
                </div>
              ) : (
                /* Subscription Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {isEs ? 'Reserva tu Lugar Gratis' : 'Reserve Your Free Spot'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isEs
                        ? 'Completa tus datos para enviarte el enlace de acceso directo y recordatorios.'
                        : 'Enter your details to receive the direct broadcast link and reminders.'}
                    </p>
                  </div>

                  {status === 'error' && (
                    <div className="p-3 bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs rounded-xl font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {isEs ? 'Nombre Completo' : 'Full Name'} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder={isEs ? 'Ej. Carlos Méndez' : 'e.g. John Doe'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>

                  {/* Email field */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {isEs ? 'Correo Electrónico' : 'Email Address'} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="carlos@minegocio.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>

                  {/* Phone / WhatsApp */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {isEs ? 'Teléfono / WhatsApp (opcional)' : 'Phone / WhatsApp (optional)'}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>

                  {/* Trade / Business Industry */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {isEs ? 'Tipo de Negocio / Oficio' : 'Industry / Trade'}
                    </label>
                    <select
                      name="trade"
                      defaultValue=""
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    >
                      <option value="" disabled>
                        {isEs ? 'Selecciona tu oficio...' : 'Select your trade...'}
                      </option>
                      <option value="Plomería / Plumbing">{isEs ? 'Plomería' : 'Plumbing'}</option>
                      <option value="HVAC / Climatización">HVAC</option>
                      <option value="Jardinería / Lawn Care">{isEs ? 'Jardinería / Lawn Care' : 'Lawn Care / Landscaping'}</option>
                      <option value="Electricidad / Electrical">{isEs ? 'Electricidad' : 'Electrical'}</option>
                      <option value="Limpieza / Cleaning">{isEs ? 'Servicios de Limpieza' : 'Cleaning Services'}</option>
                      <option value="Construcción / Remodelación">{isEs ? 'Construcción / Remodelación' : 'Construction / Remodeling'}</option>
                      <option value="Contratista Independiente">{isEs ? 'Contratista Independiente' : 'Independent Contractor'}</option>
                      <option value="Otro">{isEs ? 'Otro servicio en campo' : 'Other Field Service'}</option>
                    </select>
                  </div>

                  {/* Question for live Q&A */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {isEs ? '¿Tienes alguna duda que quieras ver en vivo?' : 'Any specific question for the live Q&A?'}
                    </label>
                    <textarea
                      name="question"
                      rows={2}
                      placeholder={isEs ? 'Ej. ¿Cómo sincronizo las rutas con mis técnicos en la calle?' : 'e.g. How do I sync routes with techs in the field?'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold rounded-xl py-3 px-4 text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition duration-150 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {status === 'loading' ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{isEs ? 'Registrando...' : 'Registering...'}</span>
                      </>
                    ) : (
                      <span>{isEs ? 'Reservar mi Lugar Gratis' : 'Reserve My Free Spot'}</span>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center leading-tight">
                    🔒 {isEs ? 'Tu información está protegida. Cero spam, solo el acceso a la sesión.' : 'Your information is protected. Zero spam, only session access.'}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Free trial footer banner */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-8 md:p-10 text-center space-y-4 shadow-xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-white">
            {isEs ? '¿Quieres ir explorando la plataforma antes de la sesión?' : 'Want to explore the platform before the session?'}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            {isEs
              ? 'Puedes crear tu cuenta en 1 minuto y comenzar tu prueba gratuita de 30 días con acceso completo a cotizaciones, despacho, facturación y reportes.'
              : 'Create your account in 1 minute and start your 30-day free trial with full access to quotes, dispatch, invoicing, and reports.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/${locale}/signup`}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition"
            >
              {isEs ? 'Comenzar Prueba Gratuita de 30 Días' : 'Start 30-Day Free Trial'}
            </Link>
            <Link
              href={`/${locale}/demo`}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-2.5 rounded-xl text-xs border border-slate-700 transition"
            >
              {isEs ? 'Solicitar Demo Personalizada 1 a 1' : 'Request 1-on-1 Personalized Demo'}
            </Link>
          </div>
        </section>

        {/* Social Hashtags */}
        <div className="text-center pt-4">
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            #PradoJobs #FieldServiceManagement #Contratistas #HVAC #Plomeria #LawnCare #OperacionesEnCampo #SaaS #ProductividadNegocios
          </p>
        </div>

      </main>

      <Footer locale={locale} />
    </div>
  );
}
