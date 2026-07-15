import { redirect } from 'next/navigation';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lng?: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';
  redirect(`/${locale}/dashboard/settings/profile-settings`);
}