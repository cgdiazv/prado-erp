import type { DocumentKind } from '@/lib/documentBranding';

interface RpcClient {
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: number | null; error: { message: string } | null }>;
}

export async function reserveDocumentNumber(
  client: RpcClient,
  organizationId: string,
  documentType: DocumentKind
): Promise<number> {
  const { data, error } = await client.rpc('reserve_org_document_number', {
    p_organization_id: organizationId,
    p_document_type: documentType,
  });

  if (error) {
    throw new Error(error.message || `Failed to reserve ${documentType} number.`);
  }

  if (!Number.isFinite(data) || Number(data) < 1) {
    throw new Error(`Invalid ${documentType} number returned by the server.`);
  }

  return Number(data);
}