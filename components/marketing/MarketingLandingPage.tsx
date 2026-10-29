'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import Footer from '@/components/Footer';
import PradoLogo from '@/components/PradoLogo';
import WorkspaceSetupModal from '@/components/WorkspaceSetupModal';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Calendar,
  CalendarDays,
  UserRound,
  Users,
  TrendingUp,
  FileText,
  ClipboardCheck,
  Receipt,
  Route,
  Wallet,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus as PlusIcon,
} from 'lucide-react';

interface MarketingLandingPageProps {
  locale?: string;
}

export default function MarketingLandingPage({ locale = 'en' }: MarketingLandingPageProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const faqs = [
    {
      q: isEs ? '¿Cómo funciona la prueba gratuita de 30 días?' : 'How does the free trial work?',
      a: isEs
        ? 'Puedes iniciar una prueba gratuita de 30 días sin requerir tarjeta de crédito y sin compromisos a largo plazo.'
        : 'You can start a 30-day free trial with no credit card required and no long-term commitment.',
    },
    {
      q: isEs ? '¿Puedo conectar QuickBooks o Xero?' : 'Can I connect QuickBooks or Xero?',
      a: isEs
        ? 'Sí. La sincronización de facturas con QuickBooks y Xero está incluida en el plan Enterprise Operations a $99 por mes.'
        : 'Yes. QuickBooks and Xero invoice sync is included with Enterprise Operations at $99 per month.',
    },
    {
      q: isEs ? '¿Cuántos usuarios puedo agregar?' : 'How many users can I add?',
      a: isEs
        ? 'Individual Operator incluye 1 perfil de usuario del sistema. Growth soporta hasta 5 roles de usuario vinculados. Enterprise incluye roles de usuario ilimitados.'
        : 'Individual Operator includes 1 System User Profile. Growth supports up to 5 Linked User Roles. Enterprise includes unlimited Linked User Roles.',
    },
    {
      q: isEs ? '¿Para qué tipos de negocios está diseñado Prado?' : 'Which businesses is Prado built for?',
      a: isEs
        ? 'Prado está diseñado para servicios de campo en cuidado de césped, construcción, limpieza, carpintería, techado y climatización (HVAC) — desde trabajos recurrentes hasta cobro de facturas.'
        : 'Prado supports field-service work in lawn care, construction, cleaning, carpentry, roofing, and HVAC — from recurring jobs to invoice collection.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#101828] flex flex-col font-sans selection:bg-[#0a9d73] selection:text-white">
      {/* 0. Top Navigation */}
      <PublicNavbar locale={locale} theme="light" onOpenTrial={() => setIsTrialModalOpen(true)} />

      {/* 1. Hero Introduction */}
      <section className="pt-12 sm:pt-20 pb-12 sm:pb-16 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          {/* Left Promise */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                {isEs ? 'MENOS ADMINISTRACIÓN. MÁS IMPULSO.' : 'LESS ADMIN. MORE MOMENTUM.'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-medium tracking-tight text-[#101828] leading-[1.06]">
              {isEs ? (
                <>
                  Automatiza tus jobs. <br />
                  Escala tu flujo de trabajo.
                </>
              ) : (
                <>
                  Automate your jobs. <br />
                  Scale your workflow.
                </>
              )}
            </h1>
          </div>

          {/* Right Get Started */}
          <div className="lg:col-span-5 space-y-6 lg:pt-8">
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              {isEs
                ? 'Cotiza, agenda y factura desde el campo — en segundos, no en hojas de cálculo. Un espacio de trabajo claro para toda tu operación.'
                : 'Quote, schedule, and invoice from the field — in seconds, not spreadsheets. One clear workspace for your entire operation.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setIsTrialModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#0a9d73] hover:bg-[#088763] text-white px-6 py-3.5 rounded-xl transition shadow-sm hover:shadow-md cursor-pointer"
              >
                <span>{isEs ? 'Iniciar Prueba de 30 Días' : 'Start 30-day Trial'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <Link
                href={`/${locale}/demo`}
                className="inline-flex items-center justify-center text-sm font-medium bg-white hover:bg-[#f9fafb] text-[#101828] border border-[#d0d5dd] px-6 py-3.5 rounded-xl transition"
              >
                <span>{isEs ? 'Explorar Demo en Vivo' : 'Explore Live Demo'}</span>
              </Link>
            </div>

            <p className="text-xs text-[#667085]">
              {isEs ? 'Sin tarjeta de crédito. Sin compromisos a largo plazo.' : 'No credit card required. No long-term commitments.'}
            </p>
          </div>
        </div>

        {/* 2. Product Showcase Stage */}
        <div className="mt-12 sm:mt-16 bg-[#f5f7fa] rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#eaecf0]/60">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Dashboard Mockup in Browser Window Frame */}
            <div className="lg:col-span-9 bg-white rounded-xl sm:rounded-2xl border border-[#eaecf0] shadow-sm overflow-hidden flex flex-col">
              {/* Browser Chrome Header */}
              <div className="px-4 py-2.5 bg-white border-b border-[#eaecf0] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eaecf0]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eaecf0]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eaecf0]"></span>
                </div>
                <div className="text-[11px] text-[#667085] bg-[#f5f7fa] px-3 py-0.5 rounded-md font-mono border border-gray-100">
                  Prado Jobs / Operations workspace
                </div>
                <div className="w-8"></div>
              </div>

              {/* Dashboard Screenshot Mockup */}
              <div className="relative w-full aspect-[16/10] bg-slate-50 overflow-hidden">
                <Image
                  src="/marketing/prado_dashboard_mockup.png"
                  alt="Prado Operations Workspace Dashboard"
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 920px"
                />
              </div>
            </div>

            {/* Product Context Sidebar */}
            <div className="lg:col-span-3 space-y-8 py-2">
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider block">
                {isEs ? 'TU OPERACIÓN, CONECTADA.' : 'YOUR OPERATION, CONNECTED.'}
              </span>

              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-[#0a9d73]" />
                    <h3 className="text-base font-semibold text-[#101828]">
                      {isEs ? 'Planifica el día' : 'Plan the day'}
                    </h3>
                  </div>
                  <p className="text-xs text-[#667085] pl-7">
                    {isEs ? 'Jobs, agendas y despacho.' : 'Jobs, schedules, and dispatch.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <UserRound className="w-5 h-5 text-[#0a9d73]" />
                    <h3 className="text-base font-semibold text-[#101828]">
                      {isEs ? 'Conoce al cliente' : 'Know the client'}
                    </h3>
                  </div>
                  <p className="text-xs text-[#667085] pl-7">
                    {isEs ? 'Clientes, propiedades e historial.' : 'Customers, properties, and history.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-5 h-5 text-[#0a9d73]" />
                    <h3 className="text-base font-semibold text-[#101828]">
                      {isEs ? 'Mira los números' : 'See the numbers'}
                    </h3>
                  </div>
                  <p className="text-xs text-[#667085] pl-7">
                    {isEs ? 'Gastos, facturas y ganancia neta.' : 'Expenses, invoices, and profit.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom showcase caption */}
          <div className="mt-4 pt-3 border-t border-[#eaecf0]/80 flex flex-col sm:flex-row justify-between items-center text-xs text-[#667085] gap-2">
            <span>
              {isEs ? 'Desde la primera visita agendada hasta la factura final.' : 'From the first scheduled visit to the final invoice.'}
            </span>
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#344054]">
              {isEs ? 'UN SOLO ESPACIO DE TRABAJO CONECTADO' : 'ONE CONNECTED WORKSPACE'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Quote to Payment (The Complete Job Lifecycle) */}
      <section id="platform" className="py-20 sm:py-24 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-14">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                {isEs ? 'EL CICLO DE VIDA COMPLETO DEL JOB' : 'THE COMPLETE JOB LIFECYCLE'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#101828]">
              {isEs ? (
                <>Un solo flujo de trabajo. Sin cabos sueltos.</>
              ) : (
                <>One workflow. No loose ends.</>
              )}
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-7">
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              {isEs
                ? 'Mantén el trabajo en movimiento desde la primera conversación hasta la factura final, sin malabares entre herramientas desconectadas.'
                : 'Keep work moving from the first conversation to the final invoice, without juggling disconnected tools.'}
            </p>
          </div>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-6 border-t border-[#eaecf0]">
          {/* Step 01 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[#0a9d73] pb-2">
              <span className="text-xs font-bold font-mono">01</span>
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#101828]">
              {isEs ? 'Cotiza el trabajo' : 'Quote the work'}
            </h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              {isEs
                ? 'Crea cotizaciones y mantén el trabajo pendiente a la vista.'
                : 'Create quotes and keep pending work in view.'}
            </p>
          </div>

          {/* Step 02 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[#0a9d73] pb-2">
              <span className="text-xs font-bold font-mono">02</span>
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#101828]">
              {isEs ? 'Agenda la visita' : 'Schedule the visit'}
            </h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              {isEs
                ? 'Integra tus jobs y el despacho diario en un solo plan.'
                : 'Bring your jobs and daily dispatch into one plan.'}
            </p>
          </div>

          {/* Step 03 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[#0a9d73] pb-2">
              <span className="text-xs font-bold font-mono">03</span>
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#101828]">
              {isEs ? 'Gestiona el job' : 'Manage the job'}
            </h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              {isEs
                ? 'Mantén conectados los detalles del cliente y los gastos de campo.'
                : 'Keep client details and field expenses connected.'}
            </p>
          </div>

          {/* Step 04 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[#0a9d73] pb-2">
              <span className="text-xs font-bold font-mono">04</span>
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#101828]">
              {isEs ? 'Cobra el pago' : 'Collect the payment'}
            </h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              {isEs
                ? 'Emite facturas y monitorea el dinero de principio a fin.'
                : 'Issue invoices and follow the money through.'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Smart Dispatch Routing */}
      <section id="dispatch" className="py-20 sm:py-24 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Feature Copy */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                {isEs ? '01 / DESPACHO Y RUTAS INTELIGENTES' : '01 / SMART DISPATCH ROUTING'}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#101828] leading-tight">
              {isEs ? (
                <>Una ruta más clara. Un día mejor administrado.</>
              ) : (
                <>A clearer route. A better-run day.</>
              )}
            </h2>

            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              {isEs
                ? 'Visualiza los jobs diarios en mapas interactivos de Google Maps. Optimiza las rutas de manejo, ahorra combustible y abre espacio para más trabajo en el día.'
                : 'See daily jobs on interactive Google Maps. Optimize driving paths, save fuel, and make room for more work in the day.'}
            </p>

            <ul className="space-y-3 pt-2">
              <li className="flex items-center gap-3 text-sm text-[#344054] font-medium">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-[#0a9d73] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>{isEs ? 'Jobs diarios, mapeados en una sola vista' : 'Daily jobs, mapped in one view'}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[#344054] font-medium">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-[#0a9d73] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>{isEs ? 'Rutas optimizadas entre visitas de servicio' : 'Optimized paths between service visits'}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[#344054] font-medium">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-[#0a9d73] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>{isEs ? 'Motor predictivo de despacho en el plan Growth' : 'Predictive Path Dispatch Engine on Growth'}</span>
              </li>
            </ul>
          </div>

          {/* Right Dispatch Illustration */}
          <div className="lg:col-span-7 bg-[#f5f7fa] rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-[#eaecf0]/80">
            <div className="flex items-center justify-between pb-6">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-[#0a9d73]" />
                <span className="text-sm font-semibold text-[#101828]">
                  {isEs ? 'Tu día, conectado' : 'Your day, connected'}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                {isEs ? 'FLUJO DE DESPACHO' : 'DISPATCH WORKFLOW'}
              </span>
            </div>

            {/* High-res rendered Map Route from Figma */}
            <div className="relative w-full aspect-[16/9] bg-white rounded-2xl overflow-hidden shadow-2xs border border-[#eaecf0]">
              <Image
                src="/marketing/dispatch_illustration_2x.png"
                alt="Smart Dispatch Route Map"
                fill
                className="object-contain p-2"
                sizes="(max-width: 1024px) 100vw, 700px"
              />
            </div>

            {/* 3 Route Stops Cards */}
            <div className="grid grid-cols-3 gap-3 pt-6">
              <div className="bg-white rounded-xl p-3 border border-[#eaecf0] shadow-2xs text-xs font-medium text-[#344054] flex items-center gap-2">
                <span className="text-[#0a9d73] font-bold font-mono">01</span>
                <span>{isEs ? 'Primera visita' : 'First visit'}</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[#eaecf0] shadow-2xs text-xs font-medium text-[#344054] flex items-center gap-2">
                <span className="text-[#0a9d73] font-bold font-mono">02</span>
                <span>{isEs ? 'Siguiente propiedad' : 'Next property'}</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[#eaecf0] shadow-2xs text-xs font-medium text-[#344054] flex items-center gap-2">
                <span className="text-[#0a9d73] font-bold font-mono">03</span>
                <span>{isEs ? 'Job final' : 'Final job'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Financial and Client Operations */}
      <section id="financials" className="bg-[#f5f7fa] py-20 sm:py-24 px-6 sm:px-12 lg:px-20 w-full border-y border-[#eaecf0]/60">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Introduction */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
                <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                  {isEs ? 'DISEÑADO PARA TODA LA OPERACIÓN' : 'BUILT FOR THE WHOLE OPERATION'}
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#101828]">
                {isEs ? 'Los detalles. Todos registrados.' : 'The details. All accounted for.'}
              </h2>
            </div>
            <p className="text-sm font-medium text-[#667085]">
              {isEs ? 'En el campo. En la oficina. En sincronía.' : 'In the field. In the office. In sync.'}
            </p>
          </div>

          {/* 2 Operations Feature Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1: Live Profit Tracking */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#eaecf0] shadow-xs flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
                  <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                    {isEs ? '02 / MONITOREO DE GANANCIAS EN VIVO' : '02 / LIVE PROFIT TRACKING'}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold text-[#101828]">
                  {isEs ? 'Conoce adónde va tu dinero.' : 'Know where your money goes.'}
                </h3>
                <p className="text-sm sm:text-base text-[#667085] leading-relaxed">
                  {isEs
                    ? 'Registra gastos en el campo, emite facturas y sigue métricas financieras en tiempo real — directo hasta la ganancia neta.'
                    : 'Log expenses in the field, issue invoices, and follow real-time financial metrics — right down to net profit.'}
                </p>
              </div>

              {/* Inset Financial Workflow Card */}
              <div className="bg-[#f5f7fa] rounded-2xl p-6 border border-[#eaecf0]/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#eaecf0]">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-[#0a9d73]" />
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">
                        {isEs ? 'Emitir facturas' : 'Issue invoices'}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {isEs ? 'Mantén la cobranza en marcha' : 'Keep billing moving'}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#0a9d73]" />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#eaecf0]">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-[#0a9d73]" />
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">
                        {isEs ? 'Registrar gastos en campo' : 'Log field expenses'}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {isEs ? 'Conoce el costo real del job' : 'Know what the job costs'}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#0a9d73]" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-[#0a9d73]" />
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">
                        {isEs ? 'Seguimiento de ganancia neta' : 'Track net profit'}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {isEs ? 'Visualiza métricas financieras en tiempo real' : 'See real-time financial metrics'}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#0a9d73]" />
                </div>
              </div>
            </div>

            {/* Card 2: Client CRM & Properties */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#eaecf0] shadow-xs flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
                  <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                    {isEs ? '03 / CRM DE CLIENTES Y PROPIEDADES' : '03 / CLIENT CRM & PROPERTIES'}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-semibold text-[#101828]">
                  {isEs ? 'Cada cliente. Cada propiedad.' : 'Every client. Every property.'}
                </h3>
                <p className="text-sm sm:text-base text-[#667085] leading-relaxed">
                  {isEs
                    ? 'Busca clientes y sus propiedades de servicio vinculadas. Mantén a la mano el historial de trabajos, pendientes y cobranzas.'
                    : 'Search customers and their service properties. Keep client history, pending jobs, and billing records within reach.'}
                </p>
              </div>

              {/* Inset Client Workflow Card */}
              <div className="bg-[#f5f7fa] rounded-2xl p-6 border border-[#eaecf0]/80 space-y-4">
                {/* Search Bar mockup */}
                <div className="bg-white rounded-xl px-4 py-3 border border-[#eaecf0] flex items-center gap-2.5 text-xs text-[#667085] shadow-2xs">
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>{isEs ? 'Clientes y propiedades de servicio' : 'Customers & service properties'}</span>
                </div>

                {/* Client connected record highlight */}
                <div className="bg-white rounded-xl p-4 border border-[#eaecf0] flex items-center gap-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0a9d73] flex items-center justify-center shrink-0">
                    <UserRound className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">
                      {isEs ? 'Un registro de cliente conectado' : 'One connected client record'}
                    </p>
                    <p className="text-xs text-[#667085]">
                      {isEs ? 'El contexto detrás de cada job' : 'The context behind every job'}
                    </p>
                  </div>
                </div>

                {/* 3 Pills */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs font-medium text-[#344054]">
                  <div className="bg-white rounded-lg py-2 border border-[#eaecf0] shadow-2xs">
                    {isEs ? 'Propiedades' : 'Properties'}
                  </div>
                  <div className="bg-white rounded-lg py-2 border border-[#eaecf0] shadow-2xs">
                    {isEs ? 'Historial jobs' : 'Job history'}
                  </div>
                  <div className="bg-white rounded-lg py-2 border border-[#eaecf0] shadow-2xs">
                    {isEs ? 'Facturación' : 'Billing records'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Connected Accounting (Integrations) */}
      <section id="integrations" className="py-20 sm:py-24 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left copy */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                {isEs ? 'CONTABILIDAD CONECTADA' : 'CONNECTED ACCOUNTING'}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#101828] leading-tight">
              {isEs ? (
                <>Tu trabajo en campo se une con tus finanzas.</>
              ) : (
                <>Your fieldwork meets your financials.</>
              )}
            </h2>

            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              {isEs
                ? 'Sincroniza facturas con QuickBooks y Xero, manteniendo tu contabilidad conectada con el trabajo que la impulsa.'
                : 'Sync invoices with QuickBooks and Xero, and keep your accounting connected to the work that drives it.'}
            </p>

            <span className="inline-block text-xs font-semibold text-[#0a9d73] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              {isEs ? 'Disponible en Enterprise Operations' : 'Available with Enterprise Operations'}
            </span>
          </div>

          {/* Right Integration Visual */}
          <div className="lg:col-span-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {/* Prado Tile */}
            <div className="w-40 h-40 bg-[#f5f7fa] rounded-2xl border border-[#eaecf0] flex flex-col items-center justify-center gap-3 p-4 shadow-2xs shrink-0">
              <PradoLogo theme="light" size="sm" />
            </div>

            {/* Sync Arrow */}
            <div className="text-[#0a9d73] p-2 rotate-90 sm:rotate-0">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>

            {/* Connected Tools Stack */}
            <div className="flex flex-col gap-3.5 w-full sm:w-64">
              <div className="bg-white rounded-xl p-4 border border-[#eaecf0] shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0a9d73] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#101828]">QuickBooks</h4>
                  <p className="text-xs text-[#667085]">{isEs ? 'Online Sync' : 'Online Sync'}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-[#eaecf0] shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#101828]">Xero</h4>
                  <p className="text-xs text-[#667085]">{isEs ? 'Accounting Sync' : 'Accounting Sync'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Industries */}
      <section id="industries" className="py-20 sm:py-24 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full border-t border-[#eaecf0]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                {isEs ? 'DISEÑADO PARA TU TIPO DE TRABAJO' : 'BUILT FOR YOUR KIND OF WORK'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#101828]">
              {isEs ? (
                <>Diferentes rubros. El mismo impulso por avanzar.</>
              ) : (
                <>Different trades. The same drive to get it done.</>
              )}
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-7">
            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              {isEs
                ? 'Flujos de trabajo creados para el servicio en campo, desde visitas recurrentes hasta cobranza de facturas. Haz que tu negocio funcione mejor.'
                : 'Purpose-built field-service workflows, from recurring jobs to invoice collection. Make the way you work work better.'}
            </p>
          </div>
        </div>

        {/* 3 Industry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
          {/* 1. Lawn Care */}
          <div className="space-y-4 group">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-xs border border-[#eaecf0]">
              <Image
                src="/marketing/industry_lawn_care.png"
                alt="Lawn Care Service Management"
                fill
                className="object-cover group-hover:scale-105 transition duration-300"
                sizes="(max-width: 768px) 100vw, 410px"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#101828]">
                  {isEs ? 'Cuidado de Césped' : 'Lawn Care'}
                </h3>
                <ArrowUpRight className="w-4 h-4 text-[#0a9d73]" />
              </div>
              <p className="text-sm text-[#667085]">
                {isEs
                  ? 'Desde visitas recurrentes hasta la factura final.'
                  : 'From recurring visits to the final invoice.'}
              </p>
            </div>
          </div>

          {/* 2. Construction */}
          <div className="space-y-4 group">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-xs border border-[#eaecf0]">
              <Image
                src="/marketing/industry_construction.png"
                alt="Construction & Contracting Management"
                fill
                className="object-cover group-hover:scale-105 transition duration-300"
                sizes="(max-width: 768px) 100vw, 410px"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#101828]">
                  {isEs ? 'Construcción' : 'Construction'}
                </h3>
                <ArrowUpRight className="w-4 h-4 text-[#0a9d73]" />
              </div>
              <p className="text-sm text-[#667085]">
                {isEs
                  ? 'Mantén jobs, propiedades y gastos conectados.'
                  : 'Keep jobs, properties, and expenses connected.'}
              </p>
            </div>
          </div>

          {/* 3. Cleaning Services */}
          <div className="space-y-4 group">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-xs border border-[#eaecf0]">
              <Image
                src="/marketing/industry_cleaning.png"
                alt="Cleaning Services Management"
                fill
                className="object-cover group-hover:scale-105 transition duration-300"
                sizes="(max-width: 768px) 100vw, 410px"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#101828]">
                  {isEs ? 'Servicios de Limpieza' : 'Cleaning Services'}
                </h3>
                <ArrowUpRight className="w-4 h-4 text-[#0a9d73]" />
              </div>
              <p className="text-sm text-[#667085]">
                {isEs
                  ? 'Integra el trabajo recurrente y los detalles del cliente.'
                  : 'Bring recurring work and client details together.'}
              </p>
            </div>
          </div>
        </div>

        {/* Also built for bar */}
        <div className="pt-6 border-t border-[#eaecf0] flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-xs text-[#667085]">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-[#344054]">
            {isEs ? 'TAMBIÉN DISEÑADO PARA' : 'ALSO BUILT FOR'}
          </span>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#344054]">
              <Check className="w-4 h-4 text-[#0a9d73]" />
              {isEs ? 'Carpintería' : 'Carpentry'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#344054]">
              <Check className="w-4 h-4 text-[#0a9d73]" />
              {isEs ? 'Techado' : 'Roofing'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#344054]">
              <Check className="w-4 h-4 text-[#0a9d73]" />
              {isEs ? 'Climatización (HVAC)' : 'HVAC Services'}
            </span>
          </div>
        </div>
      </section>

      {/* 7. Simple, Transparent Pricing */}
      <section id="pricing" className="bg-[#f5f7fa] py-20 sm:py-24 px-6 sm:px-12 lg:px-20 w-full border-y border-[#eaecf0]/60">
        <div className="max-w-7xl mx-auto space-y-14">
          {/* Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
                <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                  {isEs ? 'PRECIOS SIMPLES Y TRANSPARENTES' : 'SIMPLE, TRANSPARENT PRICING'}
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#101828]">
                {isEs ? 'El plan ideal para tu próxima etapa.' : 'The right fit for your next stage.'}
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pt-7">
              <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
                {isEs
                  ? 'Comienza con una prueba gratuita de 30 días. Sin tarjeta de crédito requerida. Sin contratos obligatorios.'
                  : 'Start with a 30-day free trial. No credit card required. No long-term commitments.'}
              </p>
            </div>
          </div>

          {/* 3 Pricing Plans Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Plan 1: Individual Operator */}
            <div className="bg-white rounded-3xl p-8 border border-[#eaecf0] shadow-xs flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  PRADO JOBS
                </span>
                <h3 className="text-2xl font-semibold text-[#101828]">
                  {isEs ? 'Individual Operator' : 'Individual Operator'}
                </h3>
                <p className="text-sm text-[#667085]">
                  {isEs ? 'Lo esencial para trabajar por cuenta propia.' : 'The essentials for working solo.'}
                </p>

                <div className="pt-2 flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight text-[#101828]">$29</span>
                  <span className="text-sm text-[#667085]">/ {isEs ? 'mes' : 'month'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTrialModalOpen(true)}
                  className="w-full text-center text-sm font-semibold bg-white hover:bg-[#f9fafb] text-[#101828] border border-[#d0d5dd] py-3.5 rounded-xl transition cursor-pointer"
                >
                  {isEs ? 'Iniciar Prueba de 30 Días' : 'Start 30-day Trial'}
                </button>
              </div>

              <div className="space-y-3.5 pt-6 border-t border-[#eaecf0]">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  {isEs ? 'CARACTERÍSTICAS DEL PLAN' : 'PLAN FEATURES'}
                </span>
                <ul className="space-y-3 text-sm text-[#344054]">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                    <span>{isEs ? '1 Perfil de Usuario del Sistema' : '1 System User Profile'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                    <span>{isEs ? 'Libro de Clientes Básico' : 'Basic Customer Ledger'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                    <span>{isEs ? 'Facturación y Estados de Cuenta' : 'Invoicing & Ledger Statements'}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan 2: Growth Operations (Featured!) */}
            <div className="bg-white rounded-3xl border-2 border-[#0a9d73] shadow-md flex flex-col justify-between overflow-hidden relative">
              {/* Ribbon */}
              <div className="bg-[#0a9d73] text-white text-[11px] font-bold text-center py-2 uppercase tracking-wider">
                {isEs ? 'MÁS POPULAR' : 'MOST POPULAR'}
              </div>

              <div className="p-8 space-y-8 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <h3 className="text-2xl font-semibold text-[#101828]">
                    {isEs ? 'Growth Operations' : 'Growth Operations'}
                  </h3>
                  <p className="text-sm text-[#667085]">
                    {isEs ? 'Mayor coordinación para un equipo en crecimiento.' : 'More coordination for a growing team.'}
                  </p>

                  <div className="pt-2 flex items-baseline gap-1.5">
                    <span className="text-5xl font-bold tracking-tight text-[#101828]">$59</span>
                    <span className="text-sm text-[#667085]">/ {isEs ? 'mes' : 'month'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTrialModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#0a9d73] hover:bg-[#088763] text-white py-3.5 rounded-xl transition shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <span>{isEs ? 'Iniciar Prueba de 30 Días' : 'Start 30-day Trial'}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5 pt-6 border-t border-[#eaecf0]">
                  <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                    {isEs ? 'CARACTERÍSTICAS DEL PLAN' : 'PLAN FEATURES'}
                  </span>
                  <ul className="space-y-3 text-sm text-[#344054]">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                      <span>{isEs ? 'Hasta 5 Roles de Usuario Vinculados' : 'Up to 5 Linked User Roles'}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                      <span>{isEs ? 'Motor de Despacho y Rutas Predictivo' : 'Predictive Path Dispatch Engine'}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                      <span>{isEs ? 'Control de Gastos de Campo' : 'Expense Ledger'}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                      <span>{isEs ? 'Pagos de Facturas en Línea (Stripe)' : 'Online Invoice Payments'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Plan 3: Enterprise Operations */}
            <div className="bg-white rounded-3xl p-8 border border-[#eaecf0] shadow-xs flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  PRADO JOBS
                </span>
                <h3 className="text-2xl font-semibold text-[#101828]">
                  {isEs ? 'Enterprise Operations' : 'Enterprise Operations'}
                </h3>
                <p className="text-sm text-[#667085]">
                  {isEs ? 'Sistemas conectados para operaciones a mayor escala.' : 'Connected systems for larger operations.'}
                </p>

                <div className="pt-2 flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight text-[#101828]">$99</span>
                  <span className="text-sm text-[#667085]">/ {isEs ? 'mes' : 'month'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTrialModalOpen(true)}
                  className="w-full text-center text-sm font-semibold bg-white hover:bg-[#f9fafb] text-[#101828] border border-[#d0d5dd] py-3.5 rounded-xl transition cursor-pointer"
                >
                  {isEs ? 'Iniciar Prueba de 30 Días' : 'Start 30-day Trial'}
                </button>
              </div>

              <div className="space-y-3.5 pt-6 border-t border-[#eaecf0]">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  {isEs ? 'CARACTERÍSTICAS DEL PLAN' : 'PLAN FEATURES'}
                </span>
                <ul className="space-y-3 text-sm text-[#344054]">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                    <span>{isEs ? 'Roles de Usuario Ilimitados' : 'Unlimited Linked User Roles'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                    <span>{isEs ? 'Integración con QuickBooks y Xero' : 'QuickBooks & Xero Integration'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                    <span>{isEs ? 'Rastreo GPS de Flota en Vivo' : 'Live GPS Fleet Tracking & Telematics Stream'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#0a9d73] shrink-0" />
                    <span>{isEs ? 'Soporte Prioritario con SLA de 4 Horas' : 'Priority Support with 4-Hour SLA'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pricing bottom note */}
          <p className="text-center text-xs text-[#667085]">
            {isEs
              ? 'Elige el plan que se adapte a tu operación. La sincronización de facturas con QuickBooks y Xero está disponible en Enterprise Operations.'
              : 'Choose the plan that matches your operation. QuickBooks & Xero invoice sync is available on Enterprise Operations.'}
          </p>
        </div>
      </section>

      {/* 8. Frequently Asked Questions */}
      <section id="faq" className="py-20 sm:py-24 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Intro */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#0a9d73] rounded-2xs"></span>
              <span className="text-[11px] font-bold text-[#0a9d73] uppercase tracking-wider">
                {isEs ? 'UN POCO MÁS DE CLARIDAD' : 'A LITTLE MORE CLARITY'}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#101828] leading-tight">
              {isEs ? (
                <>Buenas preguntas. Respuestas claras.</>
              ) : (
                <>Good questions. Clear answers.</>
              )}
            </h2>

            <p className="text-base sm:text-lg text-[#667085] leading-relaxed">
              {isEs
                ? 'Algunos detalles útiles que debes conocer antes de comenzar.'
                : 'A few things to know before you get started.'}
            </p>

            <div className="pt-2">
              <Link
                href={`/${locale}/support`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a9d73] hover:text-[#088763] transition"
              >
                <span>{isEs ? 'Visitar Soporte' : 'Visit Support'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Accordion */}
          <div className="lg:col-span-7 divide-y divide-[#eaecf0] border-t border-b border-[#eaecf0]">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="py-6">
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between text-left gap-4 cursor-pointer group"
                  >
                    <span className="text-base sm:text-lg font-medium text-[#101828] group-hover:text-[#0a9d73] transition">
                      {faq.q}
                    </span>
                    <span className="text-[#0a9d73] shrink-0 font-bold">
                      {isOpen ? <Minus className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                    </span>
                  </button>

                  {isOpen && (
                    <p className="mt-3 text-sm sm:text-base text-[#667085] leading-relaxed pr-6">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Final Trial Invitation (Dark Navy Banner) */}
      <section className="bg-[#101c35] text-white py-20 sm:py-24 px-6 sm:px-12 lg:px-20 w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-white rounded-2xs"></span>
              <span className="text-[11px] font-bold text-[#b6c2d8] uppercase tracking-wider">
                {isEs ? 'TU PRÓXIMO CAPÍTULO COMIENZA AQUÍ' : 'YOUR NEXT CHAPTER STARTS HERE'}
              </span>
            </div>

            <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-white leading-tight">
              {isEs ? (
                <>Menos tiempo en administración. Más espacio para crecer.</>
              ) : (
                <>Less time on admin. More room to grow.</>
              )}
            </h2>

            <p className="text-base sm:text-lg text-[#b6c2d8] leading-relaxed">
              {isEs
                ? 'Reúne tus jobs, tus clientes y tus números en un solo lugar.'
                : 'Bring your jobs, your clients, and your numbers into one place.'}
            </p>
          </div>

          <div className="lg:col-span-4 space-y-3 lg:text-right">
            <button
              type="button"
              onClick={() => setIsTrialModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-white hover:bg-[#f9fafb] text-[#0a9d73] px-7 py-4 rounded-xl transition shadow-lg cursor-pointer"
            >
              <span>{isEs ? 'Inicia tu prueba de 30 días' : 'Start your 30-day Trial'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-[#b6c2d8]">
              {isEs ? 'Sin tarjeta de crédito. Sin compromisos.' : 'No credit card required. No long-term commitments.'}
            </p>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <Footer locale={locale} onOpenTrial={() => setIsTrialModalOpen(true)} />

      {/* Workspace Setup Modal */}
      <WorkspaceSetupModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        locale={locale}
      />
    </div>
  );
}
