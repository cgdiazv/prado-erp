'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { getHelpdeskAdminClient, isMissingHelpdeskTableError } from '@/lib/helpdeskClient';
import { getUserOrganization } from '@/lib/organization';
import { getSupportAutoReplyMessage, isWithinSupportBusinessHours } from '@/lib/supportHours';

const ACTIVE_SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'blocked'];
const VISIBLE_SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'blocked', 'resolved', 'closed'];

type SupportChatMessage = {
  id: string;
  author_user_id: string | null;
  author_email: string | null;
  comment: string;
  created_at: string;
};

// In-process fallback store used only if neither Supabase instance has `helpdesk_tickets` or `audit_logs`.
const memorySupportThreads = new Map<string, SupportChatMessage[]>();

function getLocaleRevalidationPaths(locale: string) {
  return [
    '/dashboard/messenger',
    `/${locale}/dashboard/messenger`,
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

async function getFallbackSupportMessages(organizationId: string): Promise<SupportChatMessage[]> {
  try {
    const erpAdmin = createAdminClient();
    const { data, error } = await erpAdmin
      .from('audit_logs')
      .select('id, actor_user_id, actor_email, metadata, created_at')
      .eq('organization_id', organizationId)
      .eq('event_type', 'support_chat_message')
      .order('created_at', { ascending: true })
      .limit(200);

    if (!error && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: String(row.id),
        author_user_id: row.actor_user_id || null,
        author_email: row.actor_email || null,
        comment: typeof row.metadata?.comment === 'string' ? row.metadata.comment : '',
        created_at: row.created_at,
      }));
    }
  } catch {
    // Fall back to in-memory thread if audit_logs is unavailable
  }

  return memorySupportThreads.get(organizationId) || [];
}

async function appendFallbackSupportMessage({
  organizationId,
  authorUserId,
  authorEmail,
  comment,
}: {
  organizationId: string;
  authorUserId: string | null;
  authorEmail: string | null;
  comment: string;
}) {
  const createdAt = new Date().toISOString();
  const entry: SupportChatMessage = {
    id: randomUUID(),
    author_user_id: authorUserId,
    author_email: authorEmail,
    comment,
    created_at: createdAt,
  };

  const existing = memorySupportThreads.get(organizationId) || [];
  memorySupportThreads.set(organizationId, [...existing, entry]);

  try {
    const erpAdmin = createAdminClient();
    await erpAdmin.from('audit_logs').insert({
      event_type: 'support_chat_message',
      organization_id: organizationId,
      actor_user_id: authorUserId,
      actor_email: authorEmail,
      metadata: { comment, source: 'dashboard_chat' },
    });
  } catch {
    // Ignore if audit_logs is not migrated
  }
}

export async function checkMessengerConnection(organizationId: string) {
  void organizationId;
  return { isConnected: true, pageName: 'Prado Support', pageId: 'internal-support' };
}

export async function saveMessengerConnection(formData: FormData) {
  void formData;
  return { error: 'Facebook connection is no longer required. Use Support Chat in the dashboard.' };
}

export async function disconnectMessengerConnection(organizationId: string, locale = 'en') {
  void organizationId;
  void locale;
  return { error: 'Facebook connection is no longer required. Use Support Chat in the dashboard.' };
}

async function getOrCreateDashboardSupportTicket({
  supabaseAdmin,
  organizationId,
  organizationName,
  requestedByUserId,
  requestedByEmail,
}: {
  supabaseAdmin: any;
  organizationId: string;
  organizationName?: string | null;
  requestedByUserId: string;
  requestedByEmail: string | null;
}) {
  const { data: activeTicket, error: activeTicketError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('escalated_from', 'dashboard_chat')
    .in('status', ACTIVE_SUPPORT_TICKET_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeTicketError) {
    throw activeTicketError;
  }

  if (activeTicket?.id) {
    return activeTicket.id as string;
  }

  const orgLabel = organizationName ? ` (${organizationName})` : '';

  const { data: createdTicket, error: createdTicketError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .insert({
      organization_id: organizationId,
      requested_by_user_id: requestedByUserId,
      requested_by_email: requestedByEmail,
      subject: `Dashboard Support Chat${orgLabel}`,
      description: `Conversation started from dashboard support chat${orgLabel}.`,
      priority: 'medium',
      status: 'open',
      escalated_from: 'dashboard_chat',
      waiting_on: 'none',
      unread_for_agent_count: 0,
      unread_for_user_count: 0,
      last_comment_author_email: requestedByEmail,
    })
    .select('id')
    .single();

  if (createdTicketError || !createdTicket?.id) {
    throw createdTicketError || new Error('Failed to create support chat ticket.');
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: createdTicket.id,
    event_type: 'escalated',
    event_note: `Conversation opened from dashboard support chat${orgLabel}.`,
    actor_user_id: requestedByUserId,
    actor_email: requestedByEmail,
    metadata: { source: 'dashboard_chat', organization_name: organizationName || null },
  });

  return createdTicket.id as string;
}

export async function getDashboardSupportThread() {
  const { organization } = await requireOrgAccess();
  const { client: supabaseAdmin, hasHelpdeskTables } = await getHelpdeskAdminClient();

  if (!hasHelpdeskTables) {
    const fallbackMessages = await getFallbackSupportMessages(organization.id);
    return {
      ticketStatus: fallbackMessages.length > 0 ? 'open' : null,
      ticketPriority: fallbackMessages.length > 0 ? 'medium' : null,
      messages: fallbackMessages,
    };
  }

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .select('id, status, priority, updated_at')
    .eq('organization_id', organization.id)
    .eq('escalated_from', 'dashboard_chat')
    .in('status', VISIBLE_SUPPORT_TICKET_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ticketError) {
    if (isMissingHelpdeskTableError(ticketError)) {
      const fallbackMessages = await getFallbackSupportMessages(organization.id);
      return {
        ticketStatus: fallbackMessages.length > 0 ? 'open' : null,
        ticketPriority: fallbackMessages.length > 0 ? 'medium' : null,
        messages: fallbackMessages,
      };
    }
    return { error: ticketError.message };
  }

  if (!ticket?.id) {
    return {
      ticketStatus: null,
      ticketPriority: null,
      messages: [] as SupportChatMessage[],
    };
  }

  const ticketStatus = typeof ticket.status === 'string' ? ticket.status.toLowerCase() : null;

  // If the agent closed the conversation, clear client-visible thread history.
  if (ticketStatus === 'closed') {
    return {
      ticketStatus: 'closed',
      ticketPriority: typeof ticket.priority === 'string' ? ticket.priority : null,
      messages: [] as SupportChatMessage[],
    };
  }

  const { data: comments, error: commentsError } = await supabaseAdmin
    .from('helpdesk_ticket_comments')
    .select('id, author_user_id, author_email, comment, created_at')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  if (commentsError) {
    return { error: commentsError.message };
  }

  await supabaseAdmin
    .from('helpdesk_tickets')
    .update({ unread_for_user_count: 0, updated_at: new Date().toISOString() })
    .eq('id', ticket.id);

  return {
    ticketStatus: typeof ticket.status === 'string' ? ticket.status : null,
    ticketPriority: typeof ticket.priority === 'string' ? ticket.priority : null,
    messages: (comments || []).map((item: any) => ({
      id: item.id,
      author_user_id: item.author_user_id || null,
      author_email: item.author_email || null,
      comment: typeof item.comment === 'string' ? item.comment : '',
      created_at: item.created_at,
    })),
  };
}

export async function sendDashboardSupportMessage({
  message,
  locale = 'en',
}: {
  message: string;
  locale?: string;
}) {
  const normalizedMessage = typeof message === 'string' ? message.trim().slice(0, 4000) : '';
  if (!normalizedMessage) {
    return { error: 'Message cannot be empty.' };
  }

  const { user, organization } = await requireOrgAccess();
  const { client: supabaseAdmin, hasHelpdeskTables } = await getHelpdeskAdminClient();
  const isOnline = isWithinSupportBusinessHours();

  if (!hasHelpdeskTables) {
    await appendFallbackSupportMessage({
      organizationId: organization.id,
      authorUserId: user.id,
      authorEmail: user.email || null,
      comment: normalizedMessage,
    });

    if (!isOnline) {
      await appendFallbackSupportMessage({
        organizationId: organization.id,
        authorUserId: null,
        authorEmail: 'support@pradojob.com',
        comment: getSupportAutoReplyMessage(locale),
      });
    }

    for (const path of getLocaleRevalidationPaths(locale)) {
      revalidatePath(path);
    }

    return { success: true, offHoursAutoReplied: !isOnline };
  }

  let ticketId: string;
  try {
    ticketId = await getOrCreateDashboardSupportTicket({
      supabaseAdmin,
      organizationId: organization.id,
      organizationName: organization.name,
      requestedByUserId: user.id,
      requestedByEmail: user.email || null,
    });
  } catch (err: any) {
    if (isMissingHelpdeskTableError(err)) {
      await appendFallbackSupportMessage({
        organizationId: organization.id,
        authorUserId: user.id,
        authorEmail: user.email || null,
        comment: normalizedMessage,
      });

      if (!isOnline) {
        await appendFallbackSupportMessage({
          organizationId: organization.id,
          authorUserId: null,
          authorEmail: 'support@pradojob.com',
          comment: getSupportAutoReplyMessage(locale),
        });
      }

      for (const path of getLocaleRevalidationPaths(locale)) {
        revalidatePath(path);
      }

      return { success: true, offHoursAutoReplied: !isOnline };
    }
    return { error: err?.message || 'Failed to create support chat ticket.' };
  }

  const { error: commentError } = await supabaseAdmin
    .from('helpdesk_ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_user_id: user.id,
      author_email: user.email || null,
      comment: normalizedMessage,
    });

  if (commentError) {
    return { error: commentError.message };
  }

  const { data: currentTicket } = await supabaseAdmin
    .from('helpdesk_tickets')
    .select('unread_for_agent_count')
    .eq('id', ticketId)
    .maybeSingle();

  const unreadForAgent = Number(currentTicket?.unread_for_agent_count || 0) + 1;

  await supabaseAdmin
    .from('helpdesk_tickets')
    .update({
      unread_for_agent_count: unreadForAgent,
      unread_for_user_count: 0,
      waiting_on: 'agent',
      last_comment_at: new Date().toISOString(),
      last_comment_author_email: user.email || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'comment',
    event_note: normalizedMessage,
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: { source: 'dashboard_chat' },
  });

  if (!isOnline) {
    const autoReplyText = getSupportAutoReplyMessage(locale);
    await supabaseAdmin.from('helpdesk_ticket_comments').insert({
      ticket_id: ticketId,
      author_user_id: null,
      author_email: 'support@pradojob.com',
      comment: autoReplyText,
    });

    await supabaseAdmin.from('helpdesk_ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'comment',
      event_note: autoReplyText,
      actor_user_id: null,
      actor_email: 'support@pradojob.com',
      metadata: { source: 'dashboard_chat_auto_reply', off_hours: true },
    });
  }

  for (const path of getLocaleRevalidationPaths(locale)) {
    revalidatePath(path);
  }

  return { success: true, offHoursAutoReplied: !isOnline };
}

export async function sendMessengerReply({ message, locale = 'en' }: { message: string; locale?: string }) {
  return sendDashboardSupportMessage({ message, locale });
}

export async function markMessengerConversationRead() {
  return { success: true };
}

export async function linkMessengerConversationCustomer() {
  return { success: true };
}
