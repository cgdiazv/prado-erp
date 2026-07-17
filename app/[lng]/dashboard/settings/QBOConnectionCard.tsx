'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { checkQBOConnection, disconnectQBO } from '@/app/actions/qboActions';

interface QBOConnectionCardProps {
  organizationId: string;
}

export default function QBOConnectionCard({ organizationId }: QBOConnectionCardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams<{ lng?: string | string[] }>();
  const locale = Array.isArray(params.lng) ? params.lng[0] : params.lng;
  const isSpanish = (locale || 'en').toLowerCase().startsWith('es');
  const qboStatus = searchParams.get('qbo');

  const t = {
    loading: isSpanish ? 'Cargando integración...' : 'Loading integration...',
    title: isSpanish ? 'Integración con QuickBooks Online' : 'QuickBooks Online Integration',
    description: isSpanish
      ? 'Sincroniza tus facturas completadas de Prado directamente con QuickBooks Online.'
      : 'Sync your completed Prado invoices directly into QuickBooks Online.',
    success: isSpanish ? '¡Conexión establecida con éxito!' : 'Connection established successfully!',
    confirmDisconnect: isSpanish
      ? '¿Estás seguro de que deseas desconectar QuickBooks Online? Se detendrá la sincronización.'
      : 'Are you sure you want to disconnect QuickBooks Online? Sync will stop.',
    connectedPrefix: isSpanish ? 'Prado está conectado a la empresa:' : 'Prado is connected to company:',
    disconnectButton: isSpanish ? 'Desconectar QBO' : 'Disconnect QBO',
    disconnected: isSpanish
      ? 'Prado no está vinculado a ninguna cuenta de QuickBooks en este momento.'
      : 'Prado is not linked to any QuickBooks account at this time.',
    connectButton: isSpanish ? 'Conectar Prado con QuickBooks' : 'Connect Prado to QuickBooks',
  };

  const [isConnected, setIsConnected] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await checkQBOConnection(organizationId);
        setIsConnected(status.isConnected);
        setCompanyName(status.companyName);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, [organizationId, qboStatus]);

  const handleConnect = () => {
    window.location.href = '/api/auth/qbo';
  };

  const handleDisconnect = async () => {
    if (confirm(t.confirmDisconnect)) {
      setLoading(true);
      const res = await disconnectQBO(organizationId);
      if (res.success) {
        setIsConnected(false);
        setCompanyName(null);
        router.push(locale ? `/${locale}/dashboard/settings/integrations` : '/dashboard/settings/integrations');
      }
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 md:p-8 text-sm text-slate-500">{t.loading}</div>;

  return (
    <div className="p-6 md:p-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t.title}</h3>
        <p className="text-sm text-gray-500 mb-6">{t.description}</p>
      </div>

      {qboStatus === 'success' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <p className="text-sm text-green-700">{t.success}</p>
        </div>
      )}

      {isConnected ? (
        <div>
          <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-md mb-6 border border-blue-100">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-medium">
              {t.connectedPrefix} <strong>{companyName || 'QuickBooks'}</strong>
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition"
          >
            {t.disconnectButton}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-4">{t.disconnected}</p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#2CA01C] hover:bg-[#258917] px-5 py-2.5 rounded-lg transition shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <circle cx="24" cy="24" r="24" fill="white"/>
              <path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#2CA01C"/>
            </svg>
            {t.connectButton}
          </button>
        </div>
      )}
    </div>
  );
}
