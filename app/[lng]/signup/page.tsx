import SignUpClient from './SignupClient';

interface SignUpPageProps {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ plan?: string; email?: string; org_id?: string; org_name?: string }>;
}

export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';

  return <SignUpClient locale={locale} searchParams={searchParams} />;
}