import Link from 'next/link';
import { createAdminClient } from '@/lib/supabaseServer';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import GeneralInternalTicketModal from '@/components/management/GeneralInternalTicketModal';
import HelpdeskInbox from '@/components/management/HelpdeskInbox';
import { createHelpdeskTicket } from '../actions';

export default async function PradoManagementHelpdeskPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';

  await requirePradoManagementUser(locale);

  const supabaseAdmin = createAdminClient();

  const [{ data: organizations }, { data: tickets }, { data: comments }, { data: events }] = await Promise.all([
    supabaseAdmin.from('organizations').select('id, name'),
    supabaseAdmin
      .from('helpdesk_tickets')
      .select('id, organization_id, subject, description, priority, status, assignee_name, assignee_email, requested_by_email, escalated_from, unread_for_agent_count, unread_for_user_count, waiting_on, last_comment_at, last_comment_author_email, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('helpdesk_ticket_comments')
      .select('id, ticket_id, author_user_id, author_email, comment, created_at')
      .order('created_at', { ascending: true })
      .limit(2000),
    supabaseAdmin
      .from('helpdesk_ticket_events')
      .select('id, ticket_id, event_type, event_note, actor_email, created_at')
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  return (
    <main className="min-h-screen w-full bg-slate-50 p-8 text-slate-900">
      <div className="w-full space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Helpdesk Queue</h1>
          <p className="text-sm text-slate-500">Agent inbox for real-time handling of subscriber support conversations.</p>
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
            <GeneralInternalTicketModal locale={locale} createTicketAction={createHelpdeskTicket} redirectTo="helpdesk" />
          </div>
        </header>

        <HelpdeskInbox
          locale={locale}
          initialData={{
            organizations: (organizations || []).map((row: any) => ({ id: row.id, name: row.name || 'Unnamed organization' })),
            tickets: (tickets || []) as any,
            comments: (comments || []) as any,
            events: (events || []) as any,
          }}
        />
      </div>
    </main>
  );
}
