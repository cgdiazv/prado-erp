import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import SupportTicketModal from '@/components/dashboard/SupportTicketModal';
import HelpdeskAutoAssistant from '@/components/dashboard/HelpdeskAutoAssistant';

export default async function DashboardHelpPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="w-full px-6 md:px-10 pt-10 pb-8 text-left">
        <section className="space-y-6">
          <header className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0a9d73]">
              {isEs ? 'Centro de Ayuda' : 'Help Center'}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {isEs ? 'Asistente de Ayuda y Guias Practicas' : 'Help Assistant and How-To Guides'}
              </h1>
              <SupportTicketModal locale={locale} />
            </div>
            <p className="text-sm text-slate-500">
              {isEs
                ? 'Encuentra respuestas rapidas por flujo de trabajo y envia tickets al equipo de soporte cuando sea necesario.'
                : 'Get fast guidance by workflow and submit support tickets when needed.'}
            </p>
          </header>

          <HelpdeskAutoAssistant locale={locale} />
        </section>
      </div>
    </main>
  );
}
