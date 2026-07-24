import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import {
  getMessengerProfileApiUrl,
  getMessengerWebhookVerifyToken,
  normalizeMessengerText,
} from '@/lib/messenger';
import {
  getMessengerConnectionByPageId,
  insertMessengerMessage,
  upsertMessengerConversation,
} from '@/lib/messengerStore';

export const runtime = 'nodejs';

type MessengerWebhookEnvelope = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: {
        mid?: string;
        text?: string;
        is_echo?: boolean;
        attachments?: unknown[];
      };
    }>;
  }>;
};

function timingSafeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function verifySignature(body: string, signature: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true;
  if (!signature?.startsWith('sha256=')) return false;

  const digest = createHmac('sha256', appSecret).update(body).digest('hex');
  const expected = `sha256=${digest}`;
  return timingSafeCompare(expected, signature);
}

async function fetchSenderName(psid: string, pageAccessToken: string) {
  try {
    const response = await fetch(getMessengerProfileApiUrl(psid, pageAccessToken), {
      method: 'GET',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return typeof data?.name === 'string' ? data.name : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const challenge = url.searchParams.get('hub.challenge');
  const verifyToken = url.searchParams.get('hub.verify_token');

  if (mode === 'subscribe' && verifyToken === getMessengerWebhookVerifyToken()) {
    return new NextResponse(challenge || 'ok', { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid verify token.' }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as MessengerWebhookEnvelope;
  if (payload.object !== 'page') {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  for (const entry of payload.entry || []) {
    const pageId = entry.id || '';
    if (!pageId) continue;

    const connection = await getMessengerConnectionByPageId(pageId).catch(() => null);
    if (!connection?.organization_id) {
      continue;
    }

    for (const event of entry.messaging || []) {
      const senderPsid = event.sender?.id || '';
      const message = event.message;
      if (!senderPsid || !message || message.is_echo) {
        continue;
      }

      const occurredAtIso = new Date(event.timestamp || entry.time || Date.now()).toISOString();
      const senderName = await fetchSenderName(senderPsid, connection.page_access_token);
      const text = normalizeMessengerText(message.text, 5000);
      const attachments = Array.isArray(message.attachments) ? { attachments: message.attachments } : null;

      const conversation = await upsertMessengerConversation({
        organizationId: connection.organization_id,
        pageId: connection.page_id,
        pageName: connection.page_name,
        senderPsid,
        senderName,
        messageText: text,
        attachmentPayload: attachments,
        occurredAtIso,
        incrementUnread: true,
      });

      await insertMessengerMessage({
        conversationId: conversation.id,
        organizationId: connection.organization_id,
        pageId: connection.page_id,
        senderPsid,
        direction: 'inbound',
        messageText: text,
        attachmentPayload: attachments,
        externalMessageId: message.mid || null,
        sentAtIso: occurredAtIso,
        rawEvent: event,
      });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
