'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';

const ACTIVE_SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'blocked'];
const VISIBLE_SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'blocked', 'resolved', 'closed'];

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
  organizationId,
  requestedByUserId,
  requestedByEmail,
}: {
  organizationId: string;
  requestedByUserId: string;
  requestedByEmail: string | null;
}) {
  const supabaseAdmin = createAdminClient();
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
    throw new Error(activeTicketError.message);
  }

  if (activeTicket?.id) {
    return activeTicket.id as string;
  }

  const { data: createdTicket, error: createdTicketError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .insert({
      organization_id: organizationId,
      requested_by_user_id: requestedByUserId,
      requested_by_email: requestedByEmail,
      subject: 'Dashboard Support Chat',
      description: 'Conversation started from dashboard support chat.',
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
    throw new Error(createdTicketError?.message || 'Failed to create support chat ticket.');
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: createdTicket.id,
    event_type: 'escalated',
    event_note: 'Conversation opened from dashboard support chat.',
    actor_user_id: requestedByUserId,
    actor_email: requestedByEmail,
    metadata: { source: 'dashboard_chat' },
  });

  return createdTicket.id as string;
}

export async function getDashboardSupportThread() {
  const { organization } = await requireOrgAccess();
  const supabaseAdmin = createAdminClient();

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
    return { error: ticketError.message };
  }

  if (!ticket?.id) {
    return {
      ticketStatus: null,
      ticketPriority: null,
      messages: [] as Array<{
        id: string;
        author_user_id: string | null;
        author_email: string | null;
        comment: string;
        created_at: string;
      }>,
    };
  }

  const ticketStatus = typeof ticket.status === 'string' ? ticket.status.toLowerCase() : null;

  // If the agent closed the conversation, clear client-visible thread history.
  if (ticketStatus === 'closed') {
    return {
      ticketStatus: 'closed',
      ticketPriority: typeof ticket.priority === 'string' ? ticket.priority : null,
      messages: [] as Array<{
        id: string;
        author_user_id: string | null;
        author_email: string | null;
        comment: string;
        created_at: string;
      }>,
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
  const ticketId = await getOrCreateDashboardSupportTicket({
    organizationId: organization.id,
    requestedByUserId: user.id,
    requestedByEmail: user.email || null,
  });

  const supabaseAdmin = createAdminClient();
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

  for (const path of getLocaleRevalidationPaths(locale)) {
    revalidatePath(path);
  }

  return { success: true };
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
