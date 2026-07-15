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
  const xeroStatus = searchParams.get('xero');

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
    if (confirm('Estas seguro de que deseas desconectar Xero de Prado? Se detendra la sincronizacion.')) {
      setLoading(true);
      const res = await disconnectXero(organizationId);
      if (res.success) {
        setIsConnected(false);
        setTenantName(null);
        // Limpiamos los query params de la URL para dejar la interfaz limpia
        router.push(locale ? `/${locale}/dashboard/settings` : '/dashboard/settings');
      }
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 md:p-8">Cargando integraciones...</div>;

  return (
    <div className="p-6 md:p-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Integracion con Xero</h3>
        <p className="text-sm text-gray-500 mb-6">
          Sincroniza tus estimaciones y gastos de Prado directamente con tus libros contables.
        </p>
      </div>

      {/* Alerta de exito inicial tras el callback */}
      {xeroStatus === 'success' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <p className="text-sm text-green-700">Conexion establecida con exito!</p>
        </div>
      )}

      {/* Interfaz dinamica segun el estado */}
      {isConnected ? (
        <div>
          {/* Aviso de conectado */}
          <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-md mb-6 border border-blue-100">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-medium">
              Prado esta conectado a la organizacion: <span className="font-bold">{tenantName || 'Demo Company'}</span>
            </p>
          </div>

          {/* Boton de desconectar */}
          <button
            onClick={handleDisconnect}
            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            Desconectar Xero
          </button>
        </div>
      ) : (
        <div>
          {/* Aviso de desconectado */}
          <div className="bg-gray-50 text-gray-600 px-4 py-3 rounded-md mb-6 border border-gray-100 text-sm">
            Prado no esta vinculado a ninguna cuenta contable en este momento.
          </div>

          {/* Boton de conectar */}
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            Conectar Prado con Xero
          </button>
        </div>
      )}
    </div>
  );
}