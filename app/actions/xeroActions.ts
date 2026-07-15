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

interface CompletedJobInvoicePayload {
  organizationId: string;
  customerName: string;
  customerEmail?: string | null;
  jobType: string;
  invoiceId: string;
  dueDate: string;
  baseAmount: number;
  taxAmount: number;
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

export async function syncCompletedJobInvoiceToXero(payload: CompletedJobInvoicePayload) {
  try {
    const { accessToken, tenantId } = await getValidXeroToken(payload.organizationId);

    const contact: { Name: string; EmailAddress?: string } = {
      Name: payload.customerName,
    };

    if (payload.customerEmail && payload.customerEmail.trim().length > 0) {
      contact.EmailAddress = payload.customerEmail;
    }

    const xeroInvoiceData = {
      Invoices: [
        {
          Type: 'ACCREC',
          Contact: contact,
          Date: new Date().toISOString().split('T')[0],
          DueDate: payload.dueDate,
          Reference: `Prado Invoice #${payload.invoiceId}`,
          LineItems: [
            {
              Description: payload.jobType,
              Quantity: 1,
              UnitAmount: payload.baseAmount,
              AccountCode: '200',
            },
            {
              Description: 'Tax',
              Quantity: 1,
              UnitAmount: payload.taxAmount,
              AccountCode: '200',
            },
          ],
          Status: 'DRAFT',
        },
      ],
    };

    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Xero-tenant-id': tenantId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(xeroInvoiceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error detallado de Xero (completed job invoice):', errorData);
      throw new Error('La API de Xero rechazo la factura de job completado.');
    }

    const result = await response.json();
    return { success: true, invoice: result.Invoices?.[0] };
  } catch (error: any) {
    console.error('Failed to sync completed job invoice with Xero:', error);
    return { success: false, error: error.message };
  }
}

interface ExpensePayload {
  organizationId: string;
  vendorName: string;
  expenseDate: string;
  reference: string;
  description: string;
  amount: number;
  accountCode?: string;
}

export async function syncExpenseToXeroBill(payload: ExpensePayload) {
  try {
    const { accessToken, tenantId } = await getValidXeroToken(payload.organizationId);

    const xeroBillData = {
      Invoices: [
        {
          Type: 'ACCPAY',
          Contact: {
            Name: payload.vendorName,
          },
          Date: payload.expenseDate,
          DueDate: payload.expenseDate,
          Reference: payload.reference,
          LineItems: [
            {
              Description: payload.description,
              Quantity: 1,
              UnitAmount: payload.amount,
              // Account code may vary by Xero org — 310 is typically Purchases/COGS
              AccountCode: payload.accountCode ?? '310',
            },
          ],
          Status: 'DRAFT',
        },
      ],
    };

    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Xero-tenant-id': tenantId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(xeroBillData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error detallado de Xero (expense bill):', errorData);
      throw new Error('La API de Xero rechazó el registro del gasto.');
    }

    const result = await response.json();
    return { success: true, bill: result.Invoices?.[0] };
  } catch (error: any) {
    console.error('Failed to sync expense to Xero:', error);
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