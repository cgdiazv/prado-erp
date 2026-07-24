'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
import {
  getMessengerConnectionByOrganizationId,
  insertMessengerMessage,
  markMessengerConversationRead as markConversationReadInStore,
  setMessengerConversationCustomer,
  upsertMessengerConversation,
} from '@/lib/messengerStore';
import {
  getMessengerSendApiUrl,
  normalizeMessengerText,
  type MessengerConversationRecord,
} from '@/lib/messenger';

function getLocaleRevalidationPaths(locale: string) {
  return [
    '/dashboard/messenger',
    `/${locale}/dashboard/messenger`,
    '/dashboard/settings/integrations',
    `/${locale}/dashboard/settings/integrations`,
  ];
}

async function requireOrgAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in.');
  }

  const { organization, role } = await getUserOrganization(user.id);
  if (!organization) {
    throw new Error('Workspace not found.');
  }

  return { user, organization, role: (role || '').toLowerCase() };
}

export async function checkMessengerConnection(organizationId: string) {
  try {
    const connection = await getMessengerConnectionByOrganizationId(organizationId);
    return {
      isConnected: Boolean(connection?.id),
      pageName: connection?.page_name || null,
      pageId: connection?.page_id || null,
    };
  } catch {
    return { isConnected: false, pageName: null, pageId: null };
  }
}

export async function saveMessengerConnection(formData: FormData) {
  const locale = (formData.get('locale') as string | null)?.trim() || 'en';
  const pageId = (formData.get('pageId') as string | null)?.trim() || '';
  const pageName = (formData.get('pageName') as string | null)?.trim() || '';
  const pageAccessToken = (formData.get('pageAccessToken') as string | null)?.trim() || '';
  const { organization, role } = await requireOrgAccess();

  if (!pageId) {
    return { error: 'Page ID is required.' };
  }

  const existingConnection = await getMessengerConnectionByOrganizationId(organization.id).catch(() => null);
  const resolvedPageAccessToken = pageAccessToken || existingConnection?.page_access_token || '';

  if (!resolvedPageAccessToken) {
    return { error: 'Page ID and Page Access Token are required.' };
  }

  if (role !== 'owner' && role !== 'admin') {
    return { error: 'Only owners and admins can update Messenger settings.' };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('facebook_page_connections')
    .upsert({
      organization_id: organization.id,
      page_id: pageId,
      page_name: pageName || null,
      page_access_token: resolvedPageAccessToken,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' });

  if (error) {
    return { error: error.message };
  }

  for (const path of getLocaleRevalidationPaths(locale)) {
    revalidatePath(path);
  }

  return { success: true };
}

export async function disconnectMessengerConnection(organizationId: string, locale = 'en') {
  const { organization, role } = await requireOrgAccess();
  if (organization.id !== organizationId) {
    return { error: 'Workspace mismatch.' };
  }

  if (role !== 'owner' && role !== 'admin') {
    return { error: 'Only owners and admins can disconnect Messenger.' };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('facebook_page_connections')
    .delete()
    .eq('organization_id', organization.id);

  if (error) {
    return { error: error.message };
  }

  for (const path of getLocaleRevalidationPaths(locale)) {
    revalidatePath(path);
  }

  return { success: true };
}

export async function sendMessengerReply({
  conversationId,
  message,
  locale = 'en',
}: {
  conversationId: string;
  message: string;
  locale?: string;
}) {
  const normalizedMessage = normalizeMessengerText(message, 2000);
  if (!normalizedMessage) {
    return { error: 'Message cannot be empty.' };
  }

  const { organization } = await requireOrgAccess();
  const connection = await getMessengerConnectionByOrganizationId(organization.id);
  if (!connection) {
    return { error: 'Messenger Page is not connected.' };
  }

  const supabaseAdmin = createAdminClient();
  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from('messenger_conversations')
    .select('id, sender_psid, page_id, page_name')
    .eq('id', conversationId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (conversationError || !conversation) {
    return { error: conversationError?.message || 'Conversation not found.' };
  }

  const sendResponse = await fetch(getMessengerSendApiUrl(connection.page_access_token), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: conversation.sender_psid },
      message: { text: normalizedMessage },
    }),
  });

  const sendData = await sendResponse.json().catch(() => ({}));
  if (!sendResponse.ok) {
    const detail = typeof sendData?.error?.message === 'string' ? sendData.error.message : 'Meta rejected the reply.';
    return { error: detail };
  }

  const sentAtIso = new Date().toISOString();
  await upsertMessengerConversation({
    organizationId: organization.id,
    pageId: conversation.page_id,
    pageName: conversation.page_name || connection.page_name,
    senderPsid: conversation.sender_psid,
    messageText: normalizedMessage,
    occurredAtIso: sentAtIso,
    incrementUnread: false,
  });

  await insertMessengerMessage({
    conversationId: conversation.id,
    organizationId: organization.id,
    pageId: conversation.page_id,
    senderPsid: conversation.sender_psid,
    direction: 'outbound',
    messageText: normalizedMessage,
    externalMessageId: typeof sendData?.message_id === 'string' ? sendData.message_id : null,
    sentAtIso,
    rawEvent: sendData,
  });

  await markConversationReadInStore(conversation.id, organization.id);

  for (const path of getLocaleRevalidationPaths(locale)) {
    revalidatePath(path);
  }

  return { success: true };
}

export async function markMessengerConversationRead({
  conversationId,
  locale = 'en',
}: {
  conversationId: string;
  locale?: string;
}) {
  const { organization } = await requireOrgAccess();
  await markConversationReadInStore(conversationId, organization.id);

  for (const path of getLocaleRevalidationPaths(locale)) {
    revalidatePath(path);
  }

  return { success: true };
}

export async function linkMessengerConversationCustomer({
  conversationId,
  customerId,
  locale = 'en',
}: {
  conversationId: string;
  customerId: string | null;
  locale?: string;
}) {
  const { organization } = await requireOrgAccess();
  await setMessengerConversationCustomer(conversationId, organization.id, customerId);

  for (const path of getLocaleRevalidationPaths(locale)) {
    revalidatePath(path);
  }

  return { success: true };
}
