import { redirect } from 'next/navigation';

export default async function LiveDemoRedirectPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolved = await params;
  const locale = resolved?.lng || 'es';
  redirect(`/${locale}/live-meeting`);
}
