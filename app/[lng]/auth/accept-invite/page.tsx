import { createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AcceptInviteClient from './AcceptInviteClient';

interface AcceptInvitePageProps {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ params, searchParams }: AcceptInvitePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = resolvedParams.lng ?? 'en';
  const token = resolvedSearchParams.token ?? '';

  if (!token) {
    redirect(`/${locale}/login`);
  }

  const supabaseAdmin = createAdminClient();
  const { data: invite } = await supabaseAdmin
    .from('organization_invitations')
    .select('organization_id, email, role, accepted_at, organizations(name)')
    .eq('invite_token', token)
    .is('accepted_at', null)
    .maybeSingle();

  if (!invite) {
    redirect(`/${locale}/login`);
  }

  return (
    <AcceptInviteClient
      locale={locale}
      token={token}
      email={invite.email}
      organizationName={(invite as any).organizations?.name || 'Prado ERP'}
      role={invite.role}
    />
  );
}
