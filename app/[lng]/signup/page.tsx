import SignUpClient from './SignupClient';

interface SignUpPageProps {
  params: Promise<{ lng?: string }>;
  searchParams: Promise<{ plan?: string }>;
}

export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.lng ?? 'en';

  return <SignUpClient locale={locale} searchParams={searchParams} />;
}