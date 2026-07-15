'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { checkXeroConnection, disconnectXero } from '@/app/actions/xeroActions';

interface XeroConnectionCardProps {
  organizationId: string;
}

export default function XeroConnectionCard({ organizationId }: XeroConnectionCardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams<{ lng?: string | string[] }>();
  const locale = Array.isArray(params.lng) ? params.lng[0] : params.lng;
  const isSpanish = (locale || 'en').toLowerCase().startsWith('es');
  const xeroStatus = searchParams.get('xero');

  const t = {
    loading: isSpanish ? 'Cargando integraciones...' : 'Loading integrations...',
    title: isSpanish ? 'Integracion con Xero' : 'Xero Integration',
    description: isSpanish
      ? 'Sincroniza tus estimaciones y gastos de Prado directamente con tus libros contables.'
      : 'Sync your Prado estimates and expenses directly with your accounting books.',
    success: isSpanish ? 'Conexion establecida con exito!' : 'Connection established successfully!',
    confirmDisconnect: isSpanish
      ? 'Estas seguro de que deseas desconectar Xero de Prado? Se detendra la sincronizacion.'
      : 'Are you sure you want to disconnect Xero from Prado? Sync will stop.',
    connectedPrefix: isSpanish ? 'Prado esta conectado a la organizacion:' : 'Prado is connected to organization:',
    disconnectButton: isSpanish ? 'Desconectar Xero' : 'Disconnect Xero',
    disconnected: isSpanish
      ? 'Prado no esta vinculado a ninguna cuenta contable en este momento.'
      : 'Prado is not linked to any accounting account at this time.',
    connectButton: isSpanish ? 'Conectar Prado con Xero' : 'Connect Prado to Xero',
  };

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Cargar estado de la conexion al montar el componente
  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await checkXeroConnection(organizationId);
        setIsConnected(status.isConnected);
        setTenantName(status.tenantName);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [organizationId, xeroStatus]);

  const handleConnect = () => {
    window.location.href = '/api/auth/xero';
  };

  const handleDisconnect = async () => {
    if (confirm(t.confirmDisconnect)) {
      setLoading(true);
      const res = await disconnectXero(organizationId);
      if (res.success) {
        setIsConnected(false);
        setTenantName(null);
        // Limpiamos los query params de la URL para dejar la interfaz limpia
        router.push(locale ? `/${locale}/dashboard/settings/integrations` : '/dashboard/settings/integrations');
      }
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 md:p-8">{t.loading}</div>;

  return (
    <div className="p-6 md:p-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t.title}</h3>
        <p className="text-sm text-gray-500 mb-6">
          {t.description}
        </p>
      </div>

      {/* Alerta de exito inicial tras el callback */}
      {xeroStatus === 'success' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <p className="text-sm text-green-700">{t.success}</p>
        </div>
      )}

      {/* Interfaz dinamica segun el estado */}
      {isConnected ? (
        <div>
          {/* Aviso de conectado */}
          <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-md mb-6 border border-blue-100">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-medium">
              {t.connectedPrefix} <span className="font-bold">{tenantName || 'Demo Company'}</span>
            </p>
          </div>

          {/* Boton de desconectar */}
          <button
            onClick={handleDisconnect}
            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            {t.disconnectButton}
          </button>
        </div>
      ) : (
        <div>
          {/* Aviso de desconectado */}
          <div className="bg-gray-50 text-gray-600 px-4 py-3 rounded-md mb-6 border border-gray-100 text-sm">
            {t.disconnected}
          </div>

          {/* Boton de conectar */}
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            {t.connectButton}
          </button>
        </div>
      )}
    </div>
  );
}