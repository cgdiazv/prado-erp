'use client';

import { useEffect, useState } from 'react';
import type { EventData, Props as JoyrideProps, Step } from 'react-joyride';
import dynamic from 'next/dynamic';

// Dynamically import Joyride to prevent SSR execution issues
const Joyride = dynamic(
  () => import('react-joyride').then((mod) => mod.Joyride),
  { ssr: false }
) as React.ComponentType<JoyrideProps>;
interface OnboardingTourProps {
  locale?: string;
}

export default function OnboardingTour({ locale = 'en' }: OnboardingTourProps) {
  const [runTour, setRunTour] = useState(false);
  const isEs = locale.toLowerCase().startsWith('es');

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('prado_onboarding_completed');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setRunTour(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleRestartTour = () => {
      localStorage.removeItem('prado_onboarding_completed');
      setRunTour(false);
      window.setTimeout(() => setRunTour(true), 60);
    };

    window.addEventListener('prado:restart-tour', handleRestartTour);

    return () => {
      window.removeEventListener('prado:restart-tour', handleRestartTour);
    };
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: isEs ? '¡Bienvenido a Prado!' : 'Welcome to Prado!',
      content: isEs 
        ? 'Vamos a darte un recorrido rápido para mostrarte cómo administrar tu operación en segundos.'
        : "Let's take a quick look around to show you how to manage your operations seamlessly.",
    },
    {
      target: '.tour-sidebar',
      placement: 'right-start',
      title: isEs ? 'Panel de Navegación' : 'Workspace Operations',
      content: isEs
        ? 'Accede rápidamente a tus clientes, presupuestos, rutas de despacho y libros financieros.'
        : 'Easily navigate between your CRM records, live job schedules, routes, and financial ledgers.',
    },
    {
      target: '.tour-quick-actions',
      placement: 'bottom',
      title: isEs ? 'Acciones Rápidas' : 'Quick Actions',
      content: isEs
        ? 'Usa estos accesos para crear presupuestos, programar trabajos, gestionar facturas y registrar gastos en segundos.'
        : 'Use these shortcuts to open estimates, schedule jobs, manage invoices, and track expenses in seconds.',
    },
    {
      target: '.tour-priority-alerts',
      placement: 'bottom',
      title: isEs ? 'Alertas Prioritarias' : 'Priority Alerts',
      content: isEs
        ? 'Monitorea tus tareas críticas: facturas vencidas, trabajos sin asignar, presupuestos pendientes y trabajos incompletos.'
        : 'Monitor your critical tasks: overdue invoices, unassigned jobs, pending estimates, and incomplete work.',
    },
    {
      target: '.tour-metrics',
      placement: 'bottom',
      title: isEs ? 'Métricas de Control' : 'Real-Time Financials',
      content: isEs
        ? 'Visualiza tus ingresos totales, gastos operativos activos y balances en tiempo real.'
        : 'Monitor your total workspace revenue pipelines, production outlays, and net income balances at a glance.',
    },
    {
      target: '.tour-ledger',
      placement: 'top',
      title: isEs ? 'Registros Centralizados' : 'Interactive Management Grid',
      content: isEs
        ? 'Filtra estados, revisa historiales detallados y ejecuta acciones operativas clave.'
        : 'Filter payment statuses, review transactional summaries, and execute key business workflow actions.',
    },
    {
      target: '.tour-notification-icon',
      placement: 'bottom',
      title: isEs ? 'Completa Tu Perfil' : 'Complete Your Profile',
      content: isEs
        ? 'Abre este icono de notificaciones y completa tu perfil para terminar la configuracion inicial de tu cuenta.'
        : 'Open this notification icon and complete your profile to finish your account setup.',
    },
  ];

  const handleTourCallback = (data: EventData) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      localStorage.setItem('prado_onboarding_completed', 'true');
      setRunTour(false);
    }
  };

  if (!runTour) return null;

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      onEvent={handleTourCallback}
      options={{
        buttons: ['back', 'primary', 'skip'],
        showProgress: true,
      }}
      styles={{
        buttonPrimary: {
          backgroundColor: '#059669',
          color: '#ffffff',
          borderRadius: '10px',
          fontWeight: '600',
          fontSize: '13px',
        },
        buttonBack: {
          fontSize: '13px',
          fontWeight: '500',
          color: '#64748b',
          marginRight: '8px',
        },
        buttonSkip: {
          fontSize: '13px',
          fontWeight: '500',
          color: '#94a3b8',
        },
        tooltipContainer: {
          textAlign: 'left',
          fontFamily: 'inherit',
          borderRadius: '16px',
          padding: '4px',
        },
        tooltip: {
          backgroundColor: '#ffffff',
          color: '#0f172a',
        },
        arrow: {
          color: '#ffffff',
        },
      }}
    />
  );
}