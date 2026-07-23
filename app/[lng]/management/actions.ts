'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { isPradoManagementUser } from '@/lib/pradoManagement';

const ALLOWED_SUBSCRIPTION_STATUS = new Set([
  'trial',
  'individual',
  'growth',
  'enterprise',
  'cancelled',
  'past_due',
]);

const ALLOWED_TICKET_STATUS = new Set(['open', 'in_progress', 'blocked', 'resolved', 'closed']);
const ALLOWED_TICKET_PRIORITY = new Set(['low', 'medium', 'high', 'urgent']);

function managementRedirect(
  locale: string,
  state: 'account-updated' | 'ticket-created' | 'ticket-updated' | 'comment-added' | 'error',
  message?: string,
  organizationId?: string
) {
  const params = new URLSearchParams();

  if (state !== 'error') {
    params.set('notice', state);
  }

  if (state === 'error' && message) {
    params.set('error', message);
  }

  if (organizationId) {
    params.set('org', organizationId);
  }

  const query = params.toString();
  redirect(`/${locale}/management${query ? `?${query}` : ''}`);
}

async function requireManagementSession(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPradoManagementUser(user)) {
    redirect(`/${locale}/dashboard`);
  }

  return user;
}

export async function updateSubscriberAccount(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const organizationId = String(formData.get('organizationId') || '').trim();
  const rawStatus = String(formData.get('subscriptionStatus') || '').trim().toLowerCase();
  const rawTrialStartsAt = String(formData.get('trialStartsAt') || '').trim();
  await requireManagementSession(locale);

  if (!organizationId) {
    managementRedirect(locale, 'error', 'Organization ID is required.');
  }

  if (!ALLOWED_SUBSCRIPTION_STATUS.has(rawStatus)) {
    managementRedirect(locale, 'error', 'Invalid subscription status.');
  }

  let normalizedTrialStartsAt: string | null = null;

  if (rawTrialStartsAt) {
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawTrialStartsAt);

    if (!isValidDate) {
      managementRedirect(locale, 'error', 'Trial start must use YYYY-MM-DD format.');
    }

    normalizedTrialStartsAt = new Date(`${rawTrialStartsAt}T00:00:00.000Z`).toISOString();
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: rawStatus,
      trial_starts_at: normalizedTrialStartsAt,
    })
    .eq('id', organizationId);

  if (error) {
    managementRedirect(locale, 'error', error.message);
  }

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'account-updated', undefined, organizationId);
}

export async function createHelpdeskTicket(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const organizationIdRaw = String(formData.get('organizationId') || '').trim();
  const organizationId = organizationIdRaw.length > 0 ? organizationIdRaw : null;
  const organizationIdForRedirect = organizationId || undefined;
  const organizationName = String(formData.get('organizationName') || '').trim();
  const subject = String(formData.get('subject') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const priority = String(formData.get('priority') || 'medium').trim().toLowerCase();
  const ticketScope = String(formData.get('ticketScope') || 'subscriber').trim().toLowerCase();

  const user = await requireManagementSession(locale);

  const isGeneralScope = ticketScope === 'general';

  if (!isGeneralScope && !organizationId) {
    managementRedirect(locale, 'error', 'Organization ID is required to create a subscriber ticket.');
  }

  if (!subject || !description) {
    managementRedirect(locale, 'error', 'Ticket subject and description are required.', organizationIdForRedirect);
  }

  if (!ALLOWED_TICKET_PRIORITY.has(priority)) {
    managementRedirect(locale, 'error', 'Invalid ticket priority.', organizationIdForRedirect);
  }

  const supabaseAdmin = createAdminClient();

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .insert({
      organization_id: organizationId,
      requested_by_user_id: user.id,
      requested_by_email: user.email || null,
      subject,
      description,
      priority,
      status: 'open',
      escalated_from: isGeneralScope ? 'management_console_general' : 'management_console',
    })
    .select('id')
    .single();

  const ticketId = ticket?.id;

  if (ticketError || !ticketId) {
    managementRedirect(locale, 'error', ticketError?.message || 'Failed to create helpdesk ticket.', organizationIdForRedirect);
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'escalated',
    event_note: isGeneralScope
      ? 'Escalated from management console (general/internal ticket).'
      : `Escalated from management console for ${organizationName || organizationId}`,
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: { priority, ticket_scope: isGeneralScope ? 'general' : 'subscriber' },
  });

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'ticket-created', undefined, organizationIdForRedirect);
}

export async function updateHelpdeskTicket(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const ticketId = String(formData.get('ticketId') || '').trim();
  const status = String(formData.get('status') || '').trim().toLowerCase();
  const priority = String(formData.get('priority') || '').trim().toLowerCase();
  const assigneeName = String(formData.get('assigneeName') || '').trim() || null;
  const assigneeEmail = String(formData.get('assigneeEmail') || '').trim() || null;

  const user = await requireManagementSession(locale);

  if (!ticketId) {
    managementRedirect(locale, 'error', 'Ticket ID is required.');
  }

  if (!ALLOWED_TICKET_STATUS.has(status)) {
    managementRedirect(locale, 'error', 'Invalid ticket status.');
  }

  if (!ALLOWED_TICKET_PRIORITY.has(priority)) {
    managementRedirect(locale, 'error', 'Invalid ticket priority.');
  }

  const supabaseAdmin = createAdminClient();

  const { error: updateError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .update({
      status,
      priority,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
    })
    .eq('id', ticketId);

  if (updateError) {
    managementRedirect(locale, 'error', updateError.message);
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'updated',
    event_note: 'Ticket details updated from management console.',
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: {
      status,
      priority,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
    },
  });

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'ticket-updated');
}

export async function addHelpdeskTicketComment(formData: FormData) {
  const locale = String(formData.get('locale') || 'en');
  const ticketId = String(formData.get('ticketId') || '').trim();
  const comment = String(formData.get('comment') || '').trim();

  const user = await requireManagementSession(locale);

  if (!ticketId) {
    managementRedirect(locale, 'error', 'Ticket ID is required.');
  }

  if (!comment) {
    managementRedirect(locale, 'error', 'Comment cannot be empty.');
  }

  const supabaseAdmin = createAdminClient();

  const { error: commentError } = await supabaseAdmin
    .from('helpdesk_ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_user_id: user.id,
      author_email: user.email || null,
      comment,
    });

  if (commentError) {
    managementRedirect(locale, 'error', commentError.message);
  }

  await supabaseAdmin.from('helpdesk_ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'comment',
    event_note: comment,
    actor_user_id: user.id,
    actor_email: user.email || null,
    metadata: {},
  });

  revalidatePath(`/${locale}/management`);
  managementRedirect(locale, 'comment-added');
}
