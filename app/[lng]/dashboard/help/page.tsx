import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { getTranslations } from '@/lib/translations';
import SupportTicketForm from '@/components/SupportTicketForm';
import HelpdeskAutoAssistant from '@/components/dashboard/HelpdeskAutoAssistant';

export default async function DashboardHelpPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const translations = getTranslations(locale);

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
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section className="xl:col-span-8 space-y-6">
            <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                {isEs ? 'Centro de Ayuda' : 'Help Center'}
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {isEs ? 'Auto Helpdesk y Guias Practicas' : 'Auto Helpdesk and How-To Guides'}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {isEs
                  ? 'Encuentra respuestas rapidas por flujo de trabajo y envia tickets al equipo de soporte cuando sea necesario.'
                  : 'Get fast guidance by workflow and submit support tickets when needed.'}
              </p>
            </header>

            <HelpdeskAutoAssistant locale={locale} />
          </section>

          <aside className="xl:col-span-4 xl:sticky xl:top-6 self-start">
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                {translations.support.formTitle}
              </h2>
              <SupportTicketForm locale={locale} theme="light" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
