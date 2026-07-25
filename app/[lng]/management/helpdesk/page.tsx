import Link from 'next/link';
import { createAdminClient } from '@/lib/supabaseServer';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import GeneralInternalTicketModal from '@/components/management/GeneralInternalTicketModal';
import { addHelpdeskTicketComment, createHelpdeskTicket, updateHelpdeskTicket } from '../actions';

type HelpdeskTicket = {
  id: string;
  organization_id: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assignee_name: string | null;
  assignee_email: string | null;
  requested_by_email: string | null;
  created_at: string;
  updated_at: string;
};

type HelpdeskTicketComment = {
  id: string;
  ticket_id: string;
  author_email: string | null;
  comment: string;
  created_at: string;
};

type HelpdeskTicketEvent = {
  id: string;
  ticket_id: string;
  event_type: string;
  event_note: string | null;
  actor_email: string | null;
  created_at: string;
};

const TICKET_STATUS_OPTIONS = ['open', 'in_progress', 'blocked', 'resolved', 'closed'];
const TICKET_PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

function isMissingHelpdeskTableError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('helpdesk_tickets') &&
    (normalized.includes('does not exist') || normalized.includes('schema cache') || normalized.includes('could not find the table'))
  );
}

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US');
}

export default async function PradoManagementHelpdeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ notice?: string; error?: string; org?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';
  const orgFocus = (resolvedSearchParams.org || '').trim();
  const notice = (resolvedSearchParams.notice || '').trim();
  const hasError = (resolvedSearchParams.error || '').trim();

  await requirePradoManagementUser(locale);

  const supabaseAdmin = createAdminClient();

  const { data: organizations } = await supabaseAdmin
    .from('organizations')
    .select('id, name');

  const organizationNameById = new Map((organizations || []).map((row: any) => [row.id, row.name || 'Unnamed organization']));

  let migrationMissing = false;
  let tickets: HelpdeskTicket[] = [];
  let ticketComments: HelpdeskTicketComment[] = [];
  let ticketEvents: HelpdeskTicketEvent[] = [];

  const { data: ticketRows, error: ticketsError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .select('id, organization_id, subject, description, priority, status, assignee_name, assignee_email, requested_by_email, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (ticketsError) {
    if (isMissingHelpdeskTableError(ticketsError.message)) {
      migrationMissing = true;
    } else {
      throw new Error(ticketsError.message);
    }
  } else {
    tickets = (ticketRows || []) as HelpdeskTicket[];
  }

  const ticketIds = tickets.map((ticket) => ticket.id);

  if (!migrationMissing && ticketIds.length > 0) {
    const [{ data: commentRows, error: commentsError }, { data: eventRows, error: eventsError }] = await Promise.all([
      supabaseAdmin
        .from('helpdesk_ticket_comments')
        .select('id, ticket_id, author_email, comment, created_at')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('helpdesk_ticket_events')
        .select('id, ticket_id, event_type, event_note, actor_email, created_at')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false }),
    ]);

    if (commentsError || eventsError) {
      throw new Error(commentsError?.message || eventsError?.message || 'Failed to load helpdesk details.');
    }

    ticketComments = (commentRows || []) as HelpdeskTicketComment[];
    ticketEvents = (eventRows || []) as HelpdeskTicketEvent[];
  }

  const commentsByTicketId = new Map<string, HelpdeskTicketComment[]>();
  for (const comment of ticketComments) {
    const current = commentsByTicketId.get(comment.ticket_id) || [];
    current.push(comment);
    commentsByTicketId.set(comment.ticket_id, current);
  }

  const eventsByTicketId = new Map<string, HelpdeskTicketEvent[]>();
  for (const event of ticketEvents) {
    const current = eventsByTicketId.get(event.ticket_id) || [];
    current.push(event);
    eventsByTicketId.set(event.ticket_id, current);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Helpdesk Queue</h1>
          <p className="text-sm text-slate-500">Track escalations, assignments, status, and notes in a dedicated queue view.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/management`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Back to Management Console
            </Link>
            <Link
              href={`/${locale}/management/how-to`}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Open How-To Screens
            </Link>
            <GeneralInternalTicketModal locale={locale} createTicketAction={createHelpdeskTicket} />
          </div>
        </header>

        {notice ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice === 'ticket-created' ? 'Helpdesk ticket created and escalation recorded.' : null}
            {notice === 'ticket-updated' ? 'Helpdesk ticket updated.' : null}
            {notice === 'comment-added' ? 'Helpdesk ticket comment added.' : null}
          </p>
        ) : null}

        {hasError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {hasError}
          </p>
        ) : null}

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          {migrationMissing ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Helpdesk tables are not in the database yet. Run the latest Supabase migration to enable this workflow.
            </p>
          ) : null}

          {!migrationMissing && tickets.length === 0 ? (
            <p className="text-sm text-slate-500">No helpdesk tickets yet.</p>
          ) : null}

          {!migrationMissing && tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const ticketOrgName = ticket.organization_id
                  ? organizationNameById.get(ticket.organization_id) || ticket.organization_id
                  : 'Internal / Platform';
                const comments = commentsByTicketId.get(ticket.id) || [];
                const events = eventsByTicketId.get(ticket.id) || [];
                const isFocusedOrg = orgFocus.length > 0 && ticket.organization_id ? orgFocus === ticket.organization_id : false;

                return (
                  <article
                    key={ticket.id}
                    className={`rounded-xl border p-4 ${isFocusedOrg ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-slate-900">{ticket.subject}</p>
                      <p className="text-xs text-slate-500">Ticket ID: {ticket.id}</p>
                      <p className="text-xs text-slate-500">Subscriber: {ticketOrgName}</p>
                      <p className="text-xs text-slate-500">Opened: {formatDate(ticket.created_at)} by {ticket.requested_by_email || 'Unknown requester'}</p>
                    </div>

                    <p className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      {ticket.description}
                    </p>

                    <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <form action={updateHelpdeskTicket} className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="redirectTo" value="helpdesk" />
                        <input type="hidden" name="ticketId" value={ticket.id} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="block text-xs text-slate-600 font-medium">
                            Status
                            <select
                              name="status"
                              defaultValue={ticket.status}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            >
                              {TICKET_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-xs text-slate-600 font-medium">
                            Priority
                            <select
                              name="priority"
                              defaultValue={ticket.priority}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            >
                              {TICKET_PRIORITY_OPTIONS.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="block text-xs text-slate-600 font-medium">
                          Assignee name
                          <input
                            type="text"
                            name="assigneeName"
                            defaultValue={ticket.assignee_name || ''}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Support teammate"
                          />
                        </label>

                        <label className="block text-xs text-slate-600 font-medium">
                          Assignee email
                          <input
                            type="email"
                            name="assigneeEmail"
                            defaultValue={ticket.assignee_email || ''}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="agent@pradojob.com"
                          />
                        </label>

                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white text-xs font-semibold hover:bg-emerald-500"
                        >
                          Save ticket updates
                        </button>
                      </form>

                      <form action={addHelpdeskTicketComment} className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="redirectTo" value="helpdesk" />
                        <input type="hidden" name="ticketId" value={ticket.id} />

                        <label className="block text-xs text-slate-600 font-medium">
                          Add internal comment
                          <textarea
                            name="comment"
                            rows={5}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Add handling notes, next steps, or customer updates."
                            required
                          />
                        </label>

                        <button
                          type="submit"
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-white text-xs font-semibold hover:bg-slate-800"
                        >
                          Add comment
                        </button>
                      </form>
                    </div>

                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Comments</p>
                        {comments.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">No comments yet.</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {comments.slice(0, 5).map((comment) => (
                              <div key={comment.id} className="rounded-md bg-slate-50 border border-slate-200 p-2">
                                <p className="text-[11px] text-slate-500">{comment.author_email || 'Unknown'} • {formatDate(comment.created_at)}</p>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap">{comment.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Escalation history</p>
                        {events.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">No history events yet.</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {events.slice(0, 6).map((event) => (
                              <div key={event.id} className="rounded-md bg-slate-50 border border-slate-200 p-2">
                                <p className="text-[11px] text-slate-500">{event.event_type} • {event.actor_email || 'Unknown'} • {formatDate(event.created_at)}</p>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap">{event.event_note || 'No event note'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
