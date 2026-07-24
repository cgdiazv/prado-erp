import { createAdminClient } from '@/lib/supabaseServer';
import {
  buildMessengerPreview,
  normalizeMessengerText,
  type MessengerConversationRecord,
  type MessengerDirection,
} from '@/lib/messenger';

interface MessengerConnectionRecord {
  id: string;
  organization_id: string;
  page_id: string;
  page_name: string | null;
  page_access_token: string;
  is_active: boolean;
}

interface UpsertConversationInput {
  organizationId: string;
  pageId: string;
  pageName?: string | null;
  senderPsid: string;
  senderName?: string | null;
  messageText?: string | null;
  attachmentPayload?: unknown;
  occurredAtIso: string;
  incrementUnread?: boolean;
}

interface InsertMessageInput {
  conversationId: string;
  organizationId: string;
  pageId: string;
  senderPsid: string;
  direction: MessengerDirection;
  messageText?: string | null;
  attachmentPayload?: unknown;
  externalMessageId?: string | null;
  sentAtIso: string;
  rawEvent?: unknown;
}

export async function getMessengerConnectionByOrganizationId(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('facebook_page_connections')
    .select('id, organization_id, page_id, page_name, page_access_token, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as MessengerConnectionRecord | null) || null;
}

export async function getMessengerConnectionByPageId(pageId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('facebook_page_connections')
    .select('id, organization_id, page_id, page_name, page_access_token, is_active')
    .eq('page_id', pageId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as MessengerConnectionRecord | null) || null;
}

export async function upsertMessengerConversation(input: UpsertConversationInput) {
  const supabase = createAdminClient();
  const preview = buildMessengerPreview(input.messageText || null, input.attachmentPayload);

  const { data: existing, error: existingError } = await supabase
    .from('messenger_conversations')
    .select('id, unread_count')
    .eq('organization_id', input.organizationId)
    .eq('page_id', input.pageId)
    .eq('sender_psid', input.senderPsid)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('messenger_conversations')
      .update({
        page_name: input.pageName || null,
        sender_name: input.senderName || null,
        last_message_preview: preview,
        last_message_at: input.occurredAtIso,
        unread_count: input.incrementUnread ? Number(existing.unread_count || 0) + 1 : Number(existing.unread_count || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as MessengerConversationRecord;
  }

  const { data, error } = await supabase
    .from('messenger_conversations')
    .insert({
      organization_id: input.organizationId,
      page_id: input.pageId,
      page_name: input.pageName || null,
      sender_psid: input.senderPsid,
      sender_name: input.senderName || null,
      last_message_preview: preview,
      last_message_at: input.occurredAtIso,
      unread_count: input.incrementUnread ? 1 : 0,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MessengerConversationRecord;
}

export async function insertMessengerMessage(input: InsertMessageInput) {
  const supabase = createAdminClient();
  const normalizedText = normalizeMessengerText(input.messageText, 5000);

  const payload = {
    conversation_id: input.conversationId,
    organization_id: input.organizationId,
    page_id: input.pageId,
    sender_psid: input.senderPsid,
    direction: input.direction,
    message_text: normalizedText,
    attachment_payload: input.attachmentPayload ?? null,
    external_message_id: input.externalMessageId || null,
    sent_at: input.sentAtIso,
    raw_event: input.rawEvent ?? null,
  };

  if (input.externalMessageId) {
    const { data: existing } = await supabase
      .from('messenger_messages')
      .select('id')
      .eq('external_message_id', input.externalMessageId)
      .maybeSingle();

    if (existing?.id) {
      return existing;
    }
  }

  const { data, error } = await supabase
    .from('messenger_messages')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function markMessengerConversationRead(conversationId: string, organizationId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('messenger_conversations')
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setMessengerConversationCustomer(
  conversationId: string,
  organizationId: string,
  customerId: string | null
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('messenger_conversations')
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(error.message);
  }
}
