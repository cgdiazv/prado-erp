import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
import MessengerInbox from '@/components/dashboard/MessengerInbox';

interface MessengerPageProps {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ conversation?: string }>;
}

export default async function MessengerPage({ params, searchParams }: MessengerPageProps) {
  const resolvedParams = await params;
  await searchParams;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { organization: org } = await getUserOrganization(user.id);
  if (!org) {
    redirect(`/${locale}/auth/access-pending`);
  }

  const admin = createAdminClient();

  const { data: activeTicket } = await admin
    .from('helpdesk_tickets')
    .select('id, status, priority, subject, updated_at')
    .eq('organization_id', org.id)
    .eq('escalated_from', 'dashboard_chat')
    .in('status', ['open', 'in_progress', 'blocked', 'resolved'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: messages } = activeTicket?.id
    ? await admin
        .from('helpdesk_ticket_comments')
        .select('id, author_user_id, author_email, comment, created_at')
        .eq('ticket_id', activeTicket.id)
        .order('created_at', { ascending: true })
    : { data: [] };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 text-left space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
            {isEs ? 'Soporte' : 'Support'}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{isEs ? 'Chat con Prado' : 'Prado Support Chat'}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isEs
              ? 'Habla con el equipo de Prado directamente desde tu dashboard para ayuda operativa.'
              : 'Message the Prado team directly from your dashboard for operational help.'}
          </p>
        </div>

        <MessengerInbox
          locale={locale}
          currentUserId={user.id}
          ticketStatus={(activeTicket?.status as string | undefined) || null}
          ticketPriority={(activeTicket?.priority as string | undefined) || null}
          messages={(messages || []) as any[]}
        />
      </div>
    </main>
  );
}
