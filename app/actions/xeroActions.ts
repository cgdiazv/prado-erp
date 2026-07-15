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

type QueueWorkType = 'expense_bill' | 'completed_job_invoice';

type QueueRow = {
  id: string;
  organization_id: string;
  work_type: QueueWorkType;
  source_id: string;
  payload: any;
  attempt_count: number;
};

const XERO_QUEUE_MAX_ATTEMPTS = 5;

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown error');
}

function nextRetryAtIso(attemptCount: number) {
  const minutes = Math.min(2 ** attemptCount, 60);
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function buildExpenseBillInvoice(payload: ExpensePayload) {
  return {
    Type: 'ACCPAY',
    Contact: {
      Name: payload.vendorName || 'Unknown Vendor',
    },
    Date: payload.expenseDate,
    DueDate: payload.expenseDate,
    Reference: payload.reference,
    LineItems: [
      {
        Description: payload.description,
        Quantity: 1,
        UnitAmount: payload.amount,
        AccountCode: payload.accountCode ?? '310',
      },
    ],
    Status: 'DRAFT',
  };
}

function buildCompletedJobInvoice(payload: CompletedJobInvoicePayload) {
  const contact: { Name: string; EmailAddress?: string } = {
    Name: payload.customerName,
  };

  if (payload.customerEmail && payload.customerEmail.trim().length > 0) {
    contact.EmailAddress = payload.customerEmail;
  }

  return {
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
  };
}

async function postInvoicesToXero(organizationId: string, invoices: any[]) {
  const { accessToken, tenantId } = await getValidXeroToken(organizationId);

  const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ Invoices: invoices }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error detallado de Xero (queue batch):', errorData);
    throw new Error('Xero rejected batched sync request.');
  }

  return response.json();
}

async function enqueueXeroWork(workType: QueueWorkType, organizationId: string, sourceId: string, payload: object) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('xero_sync_queue')
      .upsert(
        {
          organization_id: organizationId,
          work_type: workType,
          source_id: sourceId,
          payload,
          status: 'pending',
          next_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: 'organization_id,work_type,source_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function enqueueXeroExpenseBill(payload: ExpensePayload & { expenseId: string }) {
  return enqueueXeroWork('expense_bill', payload.organizationId, payload.expenseId, payload);
}

export async function enqueueXeroCompletedJobInvoice(payload: CompletedJobInvoicePayload) {
  return enqueueXeroWork('completed_job_invoice', payload.organizationId, payload.invoiceId, payload);
}

export async function processPendingXeroSyncQueue(batchSize = 100) {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: pendingRows, error: fetchError } = await supabase
    .from('xero_sync_queue')
    .select('id, organization_id, work_type, source_id, payload, attempt_count')
    .eq('status', 'pending')
    .lte('next_retry_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!pendingRows || pendingRows.length === 0) {
    return { success: true, processed: 0, synced: 0, retried: 0, failed: 0 };
  }

  const queueRows = pendingRows as QueueRow[];
  const rowIds = queueRows.map((row) => row.id);

  await supabase
    .from('xero_sync_queue')
    .update({ status: 'processing', updated_at: nowIso })
    .in('id', rowIds)
    .eq('status', 'pending');

  let synced = 0;
  let retried = 0;
  let failed = 0;

  const grouped = new Map<string, QueueRow[]>();
  queueRows.forEach((row) => {
    const key = `${row.organization_id}:${row.work_type}`;
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  });

  for (const [, rows] of grouped.entries()) {
    const organizationId = rows[0].organization_id;
    const workType = rows[0].work_type;

    try {
      const invoices = rows.map((row) =>
        workType === 'expense_bill'
          ? buildExpenseBillInvoice(row.payload as ExpensePayload)
          : buildCompletedJobInvoice(row.payload as CompletedJobInvoicePayload)
      );

      const xeroResponse = await postInvoicesToXero(organizationId, invoices);
      const xeroInvoices = Array.isArray(xeroResponse?.Invoices) ? xeroResponse.Invoices : [];

      await Promise.all(
        rows.map((row, index) =>
          supabase
            .from('xero_sync_queue')
            .update({
              status: 'synced',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_error: null,
              xero_document_id: xeroInvoices[index]?.InvoiceID || null,
            })
            .eq('id', row.id)
        )
      );

      synced += rows.length;
    } catch (error: unknown) {
      const message = getErrorMessage(error).slice(0, 500);

      await Promise.all(
        rows.map((row) => {
          const nextAttempt = row.attempt_count + 1;
          const terminalFailure = nextAttempt >= XERO_QUEUE_MAX_ATTEMPTS;
          if (terminalFailure) {
            failed += 1;
          } else {
            retried += 1;
          }

          return supabase
            .from('xero_sync_queue')
            .update({
              status: terminalFailure ? 'failed' : 'pending',
              attempt_count: nextAttempt,
              next_retry_at: terminalFailure ? null : nextRetryAtIso(nextAttempt),
              last_error: message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id);
        })
      );
    }
  }

  return {
    success: true,
    processed: queueRows.length,
    synced,
    retried,
    failed,
  };
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