'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import { InlineWidget } from 'react-calendly';
import { X, Calendar, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Sparkles, Building, Mail, User, Phone, Briefcase } from 'lucide-react';
import { submitDemoRequest } from '@/app/actions';

interface LiveDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
}

export default function LiveDemoModal({ isOpen, onClose, locale = 'en' }: LiveDemoModalProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [step, setStep] = useState<'form' | 'calendar'>('form');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [userData, setUserData] = useState({ name: '', email: '' });

  // Escape key & body scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get('name') as string)?.trim() || '';
    const email = (formData.get('email') as string)?.trim() || '';

    try {
      const result = await submitDemoRequest(formData);

      if (result?.error) {
        setErrorMessage(result.error);
        setStatus('error');
        return;
      }

      setUserData({ name, email });
      setStatus('idle');
      setStep('calendar');
    } catch {
      setErrorMessage(isEs ? 'Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.' : 'There was an error submitting your request. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${
          step === 'calendar' ? 'max-w-3xl' : 'max-w-xl'
        } bg-white rounded-2xl shadow-2xl border border-[#eaecf0] z-10 transition-all duration-200 overflow-hidden my-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
      >
        {/* Header bar */}
        <div className="p-6 pb-4 sm:p-7 sm:pb-5 border-b border-[#f2f4f7] flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#f0fdf9] border border-[#a7f3d0] rounded-full px-3 py-0.5 text-xs font-semibold text-[#0a9d73] mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0a9d73] animate-pulse" />
              <span>{isEs ? 'Demostración en Vivo' : 'Live Product Walkthrough'}</span>
            </div>
            <h2 id="demo-modal-title" className="text-xl sm:text-2xl font-bold text-[#101828] tracking-tight">
              {step === 'calendar'
                ? isEs
                  ? 'Elige la fecha y hora que prefieras'
                  : 'Select your preferred date and time'
                : isEs
                ? 'Agenda una demo personalizada 1 a 1'
                : 'Schedule your personalized 1-on-1 walkthrough'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#667085] leading-relaxed">
              {step === 'calendar'
                ? isEs
                  ? 'Nuestro equipo te mostrará el flujo completo en vivo adaptado a tu negocio.'
                  : 'Our product specialist will walk you through the complete flow live.'
                : isEs
                ? 'Conoce en 20 minutos cómo Prado automatiza cotizaciones, ruteo y cobros para tu equipo.'
                : 'See how Prado automates quotes, smart dispatch, and invoicing for your field operations.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#98a2b3] hover:text-[#344054] hover:bg-[#f2f4f7] transition cursor-pointer shrink-0"
            aria-label={isEs ? 'Cerrar' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-7">
          {step === 'form' ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    {isEs ? 'Nombre Completo' : 'Full Name'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#98a2b3] absolute left-3 top-3" />
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder={isEs ? 'Ej. Carlos Gómez' : 'e.g. Alex Morgan'}
                      className="w-full bg-[#fcfcfd] border border-[#d0d5dd] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#101828] placeholder-[#98a2b3] outline-none focus:border-[#0a9d73] focus:ring-2 focus:ring-[#0a9d73]/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    {isEs ? 'Correo Electrónico de Negocio' : 'Business Email'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#98a2b3] absolute left-3 top-3" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="alex@acmeservices.com"
                      className="w-full bg-[#fcfcfd] border border-[#d0d5dd] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#101828] placeholder-[#98a2b3] outline-none focus:border-[#0a9d73] focus:ring-2 focus:ring-[#0a9d73]/20 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    {isEs ? 'Nombre de la Empresa' : 'Company Name'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#98a2b3] absolute left-3 top-3" />
                    <input
                      type="text"
                      name="companyName"
                      required
                      placeholder={isEs ? 'Ej. Jardines Prado' : 'Acme Field Services LLC'}
                      className="w-full bg-[#fcfcfd] border border-[#d0d5dd] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#101828] placeholder-[#98a2b3] outline-none focus:border-[#0a9d73] focus:ring-2 focus:ring-[#0a9d73]/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    {isEs ? 'Teléfono Móvil' : 'Phone Number'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      name="phoneCountryCode"
                      defaultValue="+1"
                      className="w-[36%] bg-[#fcfcfd] border border-[#d0d5dd] rounded-xl px-2.5 py-2.5 text-xs text-[#101828] outline-none focus:border-[#0a9d73] focus:ring-2 focus:ring-[#0a9d73]/20 transition"
                    >
                      <option value="+1">US/CA (+1)</option>
                      <option value="+52">MX (+52)</option>
                      <option value="+34">ES (+34)</option>
                      <option value="+44">UK (+44)</option>
                      <option value="+57">CO (+57)</option>
                      <option value="+54">AR (+54)</option>
                      <option value="+56">CL (+56)</option>
                      <option value="+502">GT (+502)</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-[#98a2b3] absolute left-3 top-3" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        inputMode="numeric"
                        placeholder="555 123 4567"
                        onInput={(event) => {
                          const target = event.currentTarget;
                          target.value = target.value.replace(/\D/g, '');
                        }}
                        className="w-full bg-[#fcfcfd] border border-[#d0d5dd] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#101828] placeholder-[#98a2b3] outline-none focus:border-[#0a9d73] focus:ring-2 focus:ring-[#0a9d73]/20 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    {isEs ? 'Industria Principal' : 'Primary Industry'}
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-[#98a2b3] absolute left-3 top-3" />
                    <select
                      name="notes"
                      defaultValue="Lawn Care & Landscaping"
                      className="w-full bg-[#fcfcfd] border border-[#d0d5dd] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#101828] outline-none focus:border-[#0a9d73] focus:ring-2 focus:ring-[#0a9d73]/20 transition"
                    >
                      <option value="Lawn Care & Landscaping">{isEs ? 'Jardinería y Paisajismo' : 'Lawn Care & Landscaping'}</option>
                      <option value="Construction & Remodeling">{isEs ? 'Construcción y Remodelación' : 'Construction & Remodeling'}</option>
                      <option value="Commercial & Residential Cleaning">{isEs ? 'Limpieza Comercial y Residencial' : 'Commercial & Residential Cleaning'}</option>
                      <option value="HVAC & Plumbing">{isEs ? 'HVAC y Fontanería' : 'HVAC & Plumbing'}</option>
                      <option value="Roofing">{isEs ? 'Techos y Cubiertas' : 'Roofing'}</option>
                      <option value="Electrical">{isEs ? 'Servicios Eléctricos' : 'Electrical'}</option>
                      <option value="Other Field Services">{isEs ? 'Otro Servicio de Campo' : 'Other Field Services'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    {isEs ? 'Tamaño del Equipo' : 'Team / Crew Size'}
                  </label>
                  <select
                    name="teamSize"
                    defaultValue="4-10"
                    className="w-full bg-[#fcfcfd] border border-[#d0d5dd] rounded-xl px-3 py-2.5 text-sm text-[#101828] outline-none focus:border-[#0a9d73] focus:ring-2 focus:ring-[#0a9d73]/20 transition"
                  >
                    <option value="1-3">{isEs ? '1 a 3 personas (Solo / Equipo pequeño)' : '1 - 3 people (Solo / Small team)'}</option>
                    <option value="4-10">{isEs ? '4 a 10 personas (Creciendo)' : '4 - 10 people (Growing crew)'}</option>
                    <option value="11-25">{isEs ? '11 a 25 personas (Multi-cuadrilla)' : '11 - 25 people (Multi-crew)'}</option>
                    <option value="25+">{isEs ? 'Más de 25 personas (Operación a escala)' : '25+ people (Scale operations)'}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0a9d73] hover:bg-[#088763] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 px-6 rounded-xl transition shadow-md shadow-[#0a9d73]/20 cursor-pointer"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEs ? 'Verificando datos...' : 'Confirming details...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isEs ? 'Continuar y Elegir Horario' : 'Continue to Calendar & Select Slot'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep('calendar')}
                  className="text-xs text-[#667085] hover:text-[#101828] transition underline cursor-pointer"
                >
                  {isEs ? 'O salta directo al calendario de citas' : 'Or jump directly to the live booking calendar'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#f2f4f7]">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0a9d73] hover:text-[#088763] transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Modificar mis datos' : 'Edit details'}</span>
                </button>
                <span className="text-xs text-[#667085]">
                  {userData.name ? `Scheduling for ${userData.name}` : ''}
                </span>
              </div>

              <div className="rounded-xl overflow-hidden border border-[#eaecf0] bg-white min-h-[580px]">
                <InlineWidget
                  url="https://calendly.com/pradosysjobs/30min"
                  styles={{
                    width: '100%',
                    height: '580px',
                  }}
                  prefill={{
                    email: userData.email,
                    name: userData.name,
                  }}
                  pageSettings={{
                    backgroundColor: 'ffffff',
                    hideEventTypeDetails: false,
                    hideLandingPageDetails: true,
                    primaryColor: '0a9d73',
                    textColor: '101828',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
