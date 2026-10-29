'use client';

import Link from 'next/link';
import PradoLogo from '@/components/PradoLogo';
import { useState } from 'react';
import WorkspaceSetupModal from '@/components/WorkspaceSetupModal';

interface FooterProps {
  locale?: string;
  onOpenTrial?: () => void;
}

export default function Footer({ locale = 'en', onOpenTrial }: FooterProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenTrial = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenTrial) {
      onOpenTrial();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <footer className="bg-white border-t border-[#eaecf0] pt-16 pb-12 px-6 md:px-12 text-slate-600">
        <div className="max-w-7xl mx-auto">
          {/* Top navigation grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-8 pb-12">
            {/* Brand & Purpose column (2 cols wide on desktop) */}
            <div className="md:col-span-2 space-y-4">
              <Link href={`/${locale}`} className="inline-block hover:opacity-95 transition">
                <PradoLogo theme="light" size="md" subtitle="JOB & FIELD OPERATIONS" />
              </Link>
              <p className="text-sm text-[#667085] max-w-sm leading-relaxed">
                {isEs
                  ? 'Una forma más clara de gestionar el trabajo y el negocio detrás de él.'
                  : 'A clearer way to manage the work and the business behind it.'}
              </p>
            </div>

            {/* Platform column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                {isEs ? 'Plataforma' : 'Platform'}
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#platform" className="text-[#667085] hover:text-[#101828] transition cursor-pointer">
                    {isEs ? 'Funciones' : 'Features'}
                  </a>
                </li>
                <li>
                  <a href="#industries" className="text-[#667085] hover:text-[#101828] transition cursor-pointer">
                    {isEs ? 'Industrias' : 'Industries'}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-[#667085] hover:text-[#101828] transition cursor-pointer">
                    {isEs ? 'Precios' : 'Pricing'}
                  </a>
                </li>
                <li>
                  <Link href={`/${locale}/demo`} className="text-[#667085] hover:text-[#101828] transition">
                    {isEs ? 'Demo en Vivo' : 'Live Demo'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                {isEs ? 'Recursos' : 'Resources'}
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href={`/${locale}/blog`} className="text-[#667085] hover:text-[#101828] transition">
                    {isEs ? 'Blog' : 'Blog'}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/support`} className="text-[#667085] hover:text-[#101828] transition">
                    {isEs ? 'Soporte' : 'Support'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get Started column */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                {isEs ? 'Comenzar' : 'Get started'}
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={handleOpenTrial}
                    className="text-[#667085] hover:text-[#0a9d73] transition cursor-pointer font-medium text-left"
                  >
                    {isEs ? 'Prueba Gratis de 30 Días' : '30-day Free Trial'}
                  </button>
                </li>
                <li>
                  <Link href={`/${locale}/login`} className="text-[#667085] hover:text-[#101828] transition">
                    {isEs ? 'Iniciar Sesión' : 'Sign In'}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom legal row */}
          <div className="pt-8 border-t border-[#eaecf0] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#667085]">
            <p>&copy; {new Date().getFullYear()} Prado Systems.</p>
            <div className="flex items-center gap-6">
              <Link href={`/${locale}/privacy`} className="hover:text-[#101828] transition">
                {isEs ? 'Política de Privacidad' : 'Privacy Policy'}
              </Link>
              <Link href={`/${locale}/terms`} className="hover:text-[#101828] transition">
                {isEs ? 'Términos y Condiciones' : 'Terms & Conditions'}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {!onOpenTrial && (
        <WorkspaceSetupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          locale={locale}
        />
      )}
    </>
  );
}