export type MessengerDirection = 'inbound' | 'outbound';

export interface MessengerConversationRecord {
  id: string;
  organization_id: string;
  page_id: string;
  page_name: string | null;
  customer_id: string | null;
  sender_psid: string;
  sender_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  assigned_user_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MessengerMessageRecord {
  id: string;
  conversation_id: string;
  organization_id: string;
  page_id: string;
  sender_psid: string;
  direction: MessengerDirection;
  message_text: string | null;
  attachment_payload: unknown;
  external_message_id: string | null;
  sent_at: string;
  raw_event: unknown;
  created_at?: string;
}

export function getMessengerGraphBaseUrl() {
  return process.env.META_GRAPH_API_BASE_URL || 'https://graph.facebook.com/v23.0';
}

export function getMessengerWebhookVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN || '';
}

export function normalizeMessengerText(value: unknown, maxLength = 2000): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function buildMessengerPreview(text: string | null, attachmentPayload?: unknown): string {
  if (text && text.trim().length > 0) {
    return text.trim().slice(0, 160);
  }

  const attachmentWrapper = attachmentPayload as { attachments?: unknown[] } | null | undefined;
  const attachments: unknown[] = Array.isArray(attachmentWrapper?.attachments)
    ? attachmentWrapper.attachments
    : [];

  if (attachments.length > 0) {
    return '[Attachment]';
  }

  return '[Message]';
}

export function getMessengerWebhookPath() {
  return '/api/webhooks/meta-messenger';
}

export function getMessengerSendApiUrl(pageAccessToken: string) {
  const baseUrl = getMessengerGraphBaseUrl().replace(/\/$/, '');
  return `${baseUrl}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
}

export function getMessengerProfileApiUrl(psid: string, pageAccessToken: string) {
  const baseUrl = getMessengerGraphBaseUrl().replace(/\/$/, '');
  return `${baseUrl}/${encodeURIComponent(psid)}?fields=name&access_token=${encodeURIComponent(pageAccessToken)}`;
}
