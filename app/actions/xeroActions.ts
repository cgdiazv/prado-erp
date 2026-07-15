'use server';

import { getValidXeroToken } from '@/lib/xero';
import { createAdminClient } from '@/lib/supabaseServer';

interface InvoicePayload {
  organizationId: string;
  customerName: string;
  customerEmail: string;
  estimateNumber: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
  }>;
}

export async function syncEstimateToXeroInvoice(payload: InvoicePayload) {
  try {
    // Obtener los tokens válidos (se refrescan solos si es necesario)
    const { accessToken, tenantId } = await getValidXeroToken(payload.organizationId);

    // Estructurar el JSON que pide la API de Xero
    const xeroInvoiceData = {
      Invoices: [
        {
          Type: 'ACCREC', // Cuenta por cobrar (Invoice estándar)
          Contact: {
            Name: payload.customerName,
            EmailAddress: payload.customerEmail,
          },
          Date: new Date().toISOString().split('T')[0],
          DueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 días de vencimiento
          Reference: `Prado Estimate #${payload.estimateNumber}`,
          LineItems: payload.lineItems.map(item => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unitAmount,
            AccountCode: '200', // Código de cuenta estándar para ingresos por ventas en Xero
          })),
          Status: 'DRAFT', // Se crea como borrador para que el contador la revise y apruebe
        },
      ],
    };

    // Enviar la petición a la API oficial de Xero
    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-tenant-id': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(xeroInvoiceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error detallado de Xero:', errorData);
      throw new Error('La API de Xero rechazó el documento.');
    }

    const result = await response.json();
    return { success: true, invoice: result.Invoices[0] };

  } catch (error: any) {
    console.error('Failed to sync with Xero:', error);
    return { success: false, error: error.message };
  }
}

// 1. Verificar si la organizacion esta conectada
export async function checkXeroConnection(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('xero_connections')
    .select('xero_tenant_name')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) return { isConnected: false, tenantName: null };
  return { isConnected: true, tenantName: data.xero_tenant_name };
}

// 2. Eliminar la conexion (Desconectar)
export async function disconnectXero(organizationId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('xero_connections')
    .delete()
    .eq('organization_id', organizationId);

  if (error) throw error;
  return { success: true };
}