import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePradoManagementUser } from '@/lib/pradoManagement';
import { getHowToPlaybooks } from '@/lib/helpdeskHowTo';

export default async function ManagementHowToDetailPage({
  params,
}: {
  params: Promise<{ lng?: string; slug?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  const isEs = locale.toLowerCase().startsWith('es');
  const slug = resolvedParams.slug || '';

  await requirePradoManagementUser(locale);

  const playbook = getHowToPlaybooks(locale).find((item) => item.slug === slug);
  if (!playbook) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">{playbook.audience}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{playbook.title}</h1>
          <p className="text-sm text-slate-600">{playbook.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/${locale}/management/how-to`}
              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {isEs ? 'Volver a biblioteca de guias' : 'Back to How-To Library'}
            </Link>
            <Link
              href={`/${locale}/management`}
              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {isEs ? 'Volver a consola de gestion' : 'Back to Management Console'}
            </Link>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{isEs ? 'Flujo paso a paso' : 'Step-by-step workflow'}</h2>
          <ol className="space-y-2">
            {playbook.steps.map((step, index) => (
              <li key={`${playbook.slug}-step-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{isEs ? `Paso ${index + 1}:` : `Step ${index + 1}:`}</span> {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{isEs ? 'Respuesta de soporte lista para enviar' : 'Ready-to-send helpdesk reply'}</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{playbook.quickReply}</p>
        </section>
      </div>
    </main>
  );
}
