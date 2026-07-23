import Link from 'next/link';
import { createAdminClient } from '@/lib/supabaseServer';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import HelpdeskHowToAssistant from '@/components/management/HelpdeskHowToAssistant';
import {
  addHelpdeskTicketComment,
  createHelpdeskTicket,
  updateHelpdeskTicket,
  updateSubscriberAccount,
} from './actions';

type OrganizationRow = {
  id: string;
  name: string | null;
  owner_id: string | null;
  subscription_status: string | null;
  trial_starts_at: string | null;
  created_at: string | null;
};

type OwnerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

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

const STATUS_OPTIONS = ['trial', 'individual', 'growth', 'enterprise', 'cancelled', 'past_due'];
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

function normalizeStatus(status: string | null) {
  const normalized = (status || '').trim().toLowerCase();
  return STATUS_OPTIONS.includes(normalized) ? normalized : 'trial';
}

function toDateInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function PradoManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ q?: string; status?: string; notice?: string; error?: string; org?: string; general?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';

  await requirePradoManagementUser(locale);

  const q = (resolvedSearchParams.q || '').trim().toLowerCase();
  const statusFilter = (resolvedSearchParams.status || '').trim().toLowerCase();
  const notice = (resolvedSearchParams.notice || '').trim();
  const hasError = (resolvedSearchParams.error || '').trim();
  const orgFocus = (resolvedSearchParams.org || '').trim();
  const showGeneralTicketBlock = (resolvedSearchParams.general || '').trim() === '1';

  const supabaseAdmin = createAdminClient();

  const { data: organizations, error: organizationsError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, owner_id, subscription_status, trial_starts_at, created_at')
    .order('created_at', { ascending: false });

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  const rows = (organizations || []) as OrganizationRow[];
  const ownerIds = Array.from(new Set(rows.map((row) => row.owner_id).filter(Boolean))) as string[];

  const { data: ownerProfiles } = ownerIds.length
    ? await supabaseAdmin
        .from('user_profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', ownerIds)
    : { data: [] };

  const ownerProfileByUserId = new Map<string, OwnerProfile>();
  for (const profile of (ownerProfiles || []) as OwnerProfile[]) {
    ownerProfileByUserId.set(profile.user_id, profile);
  }

  const ownerEmailEntries = await Promise.all(
    ownerIds.map(async (ownerId) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(ownerId);
      return [ownerId, data?.user?.email || null] as const;
    })
  );

  const ownerEmailByUserId = new Map<string, string | null>(ownerEmailEntries);
  const organizationNameById = new Map(rows.map((row) => [row.id, row.name || 'Unnamed organization']));

  const filteredRows = rows.filter((row) => {
    const normalizedStatus = (row.subscription_status || '').toLowerCase();
    if (statusFilter && normalizedStatus !== statusFilter) return false;

    if (!q) return true;

    const ownerEmail = row.owner_id ? ownerEmailByUserId.get(row.owner_id) || '' : '';
    const ownerProfile = row.owner_id ? ownerProfileByUserId.get(row.owner_id) : null;
    const ownerName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim();

    return [row.name || '', row.id, ownerEmail, ownerName]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  let migrationMissing = false;
  let tickets: HelpdeskTicket[] = [];
  let ticketComments: HelpdeskTicketComment[] = [];
  let ticketEvents: HelpdeskTicketEvent[] = [];

  const { data: ticketRows, error: ticketsError } = await supabaseAdmin
    .from('helpdesk_tickets')
    .select('id, organization_id, subject, description, priority, status, assignee_name, assignee_email, requested_by_email, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

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
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Prado Management Console</h1>
          <p className="text-sm text-slate-500 mt-2">Manage subscriber account status, trial lifecycle, and support/helpdesk operations.</p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href="mailto:support@pradojob.com?subject=Prado%20Helpdesk%20Escalation"
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
            >
              Email Helpdesk (Fallback)
            </a>
            <Link
              href={`/${locale}/management/how-to`}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
            >
              Open How-To Screens
            </Link>
            <Link
              href={`/${locale}/management?general=1#general-ticket`}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
            >
              Create General/Internal Ticket
            </Link>
          </div>
        </header>

        <HelpdeskHowToAssistant locale={locale} />

        {showGeneralTicketBlock ? (
        <section id="general-ticket" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">General/Internal Ticket</h2>
            <p className="text-sm text-slate-500">Use this for platform, infra, billing-tooling, or internal operations issues not tied to one subscriber.</p>
          </div>

          <form action={createHelpdeskTicket} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="ticketScope" value="general" />
            <input type="hidden" name="organizationId" value="" />
            <input type="hidden" name="organizationName" value="Internal" />

            <label className="block text-xs text-slate-600 font-medium lg:col-span-2">
              Subject
              <input
                type="text"
                name="subject"
                defaultValue="Internal operations ticket"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="block text-xs text-slate-600 font-medium lg:col-span-2">
              Description
              <textarea
                name="description"
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Describe issue impact, affected system, and expected next action."
                required
              />
            </label>

            <label className="block text-xs text-slate-600 font-medium">
              Priority
              <select
                name="priority"
                defaultValue="medium"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {TICKET_PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-800"
              >
                Create internal ticket
              </button>
            </div>
          </form>

          <div className="pt-1">
            <Link
              href={`/${locale}/management`}
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Hide general/internal ticket form
            </Link>
          </div>
        </section>
        ) : null}

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              name="q"
              defaultValue={resolvedSearchParams.q || ''}
              placeholder="Search by org name, owner name, owner email, or org id"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Apply filters
            </button>
          </form>

          {notice ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice === 'account-updated' ? 'Subscriber account updated successfully.' : null}
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

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 text-left font-semibold">Subscriber</th>
                  <th className="py-2 pr-3 text-left font-semibold">Owner</th>
                  <th className="py-2 pr-3 text-left font-semibold">Account Controls</th>
                  <th className="py-2 pr-3 text-left font-semibold">Support</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const ownerProfile = row.owner_id ? ownerProfileByUserId.get(row.owner_id) : null;
                  const ownerEmail = row.owner_id ? ownerEmailByUserId.get(row.owner_id) : null;
                  const ownerName = `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim() || 'N/A';
                  const ownerPhone = ownerProfile?.phone?.trim() || 'N/A';

                  return (
                    <tr key={row.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">{row.name || 'Unnamed organization'}</p>
                        <p className="text-xs text-slate-500">Org ID: {row.id}</p>
                        <p className="text-xs text-slate-500">Created: {formatDate(row.created_at)}</p>
                      </td>

                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-800">{ownerName}</p>
                        <p className="text-xs text-slate-500">{ownerEmail || 'No email available'}</p>
                        <p className="text-xs text-slate-500">{ownerPhone}</p>
                      </td>

                      <td className="py-3 pr-3">
                        <form action={updateSubscriberAccount} className="space-y-2 min-w-[260px]">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="organizationId" value={row.id} />

                          <label className="block text-xs text-slate-600 font-medium">
                            Subscription status
                            <select
                              name="subscriptionStatus"
                              defaultValue={normalizeStatus(row.subscription_status)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block text-xs text-slate-600 font-medium">
                            Trial starts at
                            <input
                              type="date"
                              name="trialStartsAt"
                              defaultValue={toDateInputValue(row.trial_starts_at)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>

                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-white text-xs font-semibold hover:bg-emerald-500"
                          >
                            Save account
                          </button>
                        </form>
                      </td>

                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-2 min-w-[240px]">
                          <form action={createHelpdeskTicket} className="space-y-2 rounded-lg border border-slate-200 p-3">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="organizationId" value={row.id} />
                            <input type="hidden" name="organizationName" value={row.name || row.id} />
                            <label className="block text-xs text-slate-600 font-medium">
                              Escalation subject
                              <input
                                type="text"
                                name="subject"
                                defaultValue={`Helpdesk escalation - ${row.name || row.id}`}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                                required
                              />
                            </label>
                            <label className="block text-xs text-slate-600 font-medium">
                              Issue summary
                              <textarea
                                name="description"
                                rows={3}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                                placeholder="Describe the issue, impact, and requested action."
                                required
                              />
                            </label>
                            <label className="block text-xs text-slate-600 font-medium">
                              Priority
                              <select
                                name="priority"
                                defaultValue="high"
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                              >
                                {TICKET_PRIORITY_OPTIONS.map((priority) => (
                                  <option key={priority} value={priority}>
                                    {priority}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="submit"
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-white text-xs font-semibold hover:bg-slate-800"
                            >
                              Create helpdesk ticket
                            </button>
                          </form>
                          {ownerEmail ? (
                            <a
                              href={`mailto:${ownerEmail}?subject=Prado%20Account%20Update%20-%20${encodeURIComponent(row.name || row.id)}`}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                            >
                              Email subscriber owner
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-sm text-slate-500">No subscribers match the current filters.</p>
          ) : null}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Helpdesk Queue</h2>
              <p className="text-sm text-slate-500">Track escalations, assignments, status, and notes.</p>
            </div>
          </div>

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
