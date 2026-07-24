import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
import MessengerInbox from '@/components/dashboard/MessengerInbox';
import { getMessengerConnectionByOrganizationId } from '@/lib/messengerStore';

interface MessengerPageProps {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ conversation?: string }>;
}

export default async function MessengerPage({ params, searchParams }: MessengerPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
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
  const connection = await getMessengerConnectionByOrganizationId(org.id).catch(() => null);

  const { data: conversations } = await admin
    .from('messenger_conversations')
    .select('id, sender_name, sender_psid, last_message_preview, last_message_at, unread_count, customer_id')
    .eq('organization_id', org.id)
    .order('last_message_at', { ascending: false });

  const conversationRows = conversations || [];
  const selectedConversationId = resolvedSearchParams.conversation || conversationRows[0]?.id || null;

  const { data: selectedMessages } = selectedConversationId
    ? await admin
        .from('messenger_messages')
        .select('id, direction, message_text, sent_at')
        .eq('organization_id', org.id)
        .eq('conversation_id', selectedConversationId)
        .order('sent_at', { ascending: true })
    : { data: [] };

  const { data: customers } = await admin
    .from('customers')
    .select('id, first_name, last_name, company_name')
    .eq('organization_id', org.id)
    .order('first_name', { ascending: true });

  const customerOptions = (customers || []).map((customer: any) => ({
    id: customer.id,
    label: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || 'Customer',
  }));

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 text-left space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
            {isEs ? 'Mensajería' : 'Messaging'}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{isEs ? 'Messenger Inbox' : 'Messenger Inbox'}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isEs
              ? 'Gestiona mensajes entrantes de tu Facebook Page y responde sin salir de Prado.'
              : 'Manage incoming Facebook Page messages and reply without leaving Prado.'}
          </p>
        </div>

        <MessengerInbox
          locale={locale}
          connected={Boolean(connection)}
          conversations={conversationRows as any[]}
          selectedConversationId={selectedConversationId}
          selectedMessages={(selectedMessages || []) as any[]}
          customerOptions={customerOptions}
        />
      </div>
    </main>
  );
}
