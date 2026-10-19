import { createAdminClient } from '@/lib/supabaseAdmin';

export interface AuditLogPayload {
  eventType: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin.from('audit_logs').insert([
      {
        event_type: payload.eventType,
        actor_user_id: payload.actorUserId || null,
        actor_email: payload.actorEmail ? payload.actorEmail.toLowerCase().trim() : null,
        organization_id: payload.organizationId || null,
        ip_address: payload.ipAddress || null,
        user_agent: payload.userAgent || null,
        metadata: payload.metadata || {},
      },
    ]);
  } catch (err) {
    // Non-blocking fallback so audit logging failures never break primary application flow
    console.warn('[AuditLogger] Failed to write audit event:', err);
  }
}

export function extractClientNetworkContext(headersObj: Headers | { get(name: string): string | null }): {
  clientIp: string;
  userAgent: string;
} {
  const cfConnectingIp = headersObj.get('cf-connecting-ip');
  const forwardedFor = headersObj.get('x-forwarded-for');
  const realIp = headersObj.get('x-real-ip');
  const userAgent = headersObj.get('user-agent') || 'unknown';

  let clientIp = cfConnectingIp || realIp;
  if (!clientIp && forwardedFor) {
    clientIp = forwardedFor.split(',')[0].trim();
  }

  return {
    clientIp: clientIp || 'unknown',
    userAgent,
  };
}
