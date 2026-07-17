'use server';

import { getValidQBOToken, getQBOBaseUrl } from '@/lib/qbo';
import { createAdminClient } from '@/lib/supabaseServer';

interface QBOInvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
}

interface CreateQBOInvoicePayload {
  organizationId: string;
  customerName: string;
  customerEmail?: string | null;
  jobType: string;
  dueDate: string;
  baseAmount: number;
  taxAmount: number;
}

export async function checkQBOConnection(organizationId: string) {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('qbo_connections')
      .select('realm_id, company_name')
      .eq('organization_id', organizationId)
      .single();

    return {
      isConnected: !!data,
      companyName: data?.company_name ?? null,
    };
  } catch {
    return { isConnected: false, companyName: null };
  }
}

export async function disconnectQBO(organizationId: string) {
  try {
    const supabase = createAdminClient();
    await supabase.from('qbo_connections').delete().eq('organization_id', organizationId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function syncInvoiceToQBO(payload: CreateQBOInvoicePayload) {
  try {
    const { accessToken, realmId } = await getValidQBOToken(payload.organizationId);
    const baseUrl = getQBOBaseUrl();

    // 1. Find or create the customer (QBO calls them "Customer")
    const customerRef = await findOrCreateQBOCustomer(
      accessToken,
      realmId,
      baseUrl,
      payload.customerName,
      payload.customerEmail
    );

    // 2. Build the invoice payload
    const total = payload.baseAmount + payload.taxAmount;
    const invoiceData = {
      CustomerRef: customerRef,
      DueDate: payload.dueDate,
      Line: [
        {
          Amount: payload.baseAmount,
          DetailType: 'SalesItemLineDetail',
          Description: payload.jobType,
          SalesItemLineDetail: {
            Qty: 1,
            UnitPrice: payload.baseAmount,
            ItemRef: { value: '1', name: 'Services' },
          },
        },
        ...(payload.taxAmount > 0
          ? [
              {
                Amount: payload.taxAmount,
                DetailType: 'SalesItemLineDetail',
                Description: 'Estimated Tax (8.25%)',
                SalesItemLineDetail: {
                  Qty: 1,
                  UnitPrice: payload.taxAmount,
                  ItemRef: { value: '1', name: 'Services' },
                },
              },
            ]
          : []),
      ],
      TotalAmt: total,
      DocNumber: `PRADO-${Date.now()}`,
    };

    const response = await fetch(`${baseUrl}/v3/company/${realmId}/invoice?minorversion=65`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('QBO invoice error:', errorData);
      throw new Error('QBO API rejected the invoice.');
    }

    const result = await response.json();
    return { success: true, invoice: result.Invoice };
  } catch (error: any) {
    console.error('Failed to sync invoice to QBO:', error);
    return { success: false, error: error.message };
  }
}

async function findOrCreateQBOCustomer(
  accessToken: string,
  realmId: string,
  baseUrl: string,
  displayName: string,
  email?: string | null
) {
  // Search for existing customer
  const query = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${displayName.replace(/'/g, "\\'")}'`);
  const searchRes = await fetch(
    `${baseUrl}/v3/company/${realmId}/query?query=${query}&minorversion=65`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const existing = searchData?.QueryResponse?.Customer?.[0];
    if (existing) {
      return { value: existing.Id, name: existing.DisplayName };
    }
  }

  // Create new customer
  const customerPayload: Record<string, any> = { DisplayName: displayName };
  if (email) {
    customerPayload.PrimaryEmailAddr = { Address: email };
  }

  const createRes = await fetch(`${baseUrl}/v3/company/${realmId}/customer?minorversion=65`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(customerPayload),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create customer in QBO.');
  }

  const createData = await createRes.json();
  const customer = createData.Customer;
  return { value: customer.Id, name: customer.DisplayName };
}
