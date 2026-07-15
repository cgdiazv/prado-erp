import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const requestUrl = new URL(request.url);
  const [, lng] = requestUrl.pathname.split('/');
  const safeLng = lng || 'en';

  if (!user) {
    return NextResponse.redirect(`${requestUrl.origin}/${safeLng}/login`, {
      status: 303,
    });
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('Delete account failed:', error.message);
    return NextResponse.redirect(`${requestUrl.origin}/${safeLng}/dashboard/settings?delete=error`, {
      status: 303,
    });
  }

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/${safeLng}/signup`, {
    status: 303,
  });
}