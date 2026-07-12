'use server';

import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Supabase Login Error:", error.message);
    return { error: error.message };
  }

  redirect('/');
}

export async function signup(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const companyName = formData.get('companyName') as string;

    if (!email || !password || !companyName) {
      return { error: 'All registration fields are required.' };
    }

    const supabase = await createClient();

    // 1. Register the raw user inside Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error("Supabase Auth Error:", authError?.message);
      return { error: authError?.message || 'Authentication signup failed.' };
    }

    // 2. Create the Organization profile matching this new user account
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert([
        {
          name: companyName,
          owner_id: authData.user.id,
        }
      ])
      .select()
      .single();

    if (orgError) {
      console.error("Supabase Database Org Error:", orgError.message);
      return { error: orgError.message };
    }

  } catch (err: any) {
    console.error("Server Action Fatal Crash:", err);
    // This stops Next.js from swallowing the crash and forcing an empty {}
    return { error: err?.message || 'A secure server-side connection error occurred.' };
  }

  // The redirect must happen outside the try/catch block because Next.js
  // implements redirect() by intentionally throwing a navigation error.
  redirect('/signup/check-email');
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();

  // 1. Fetch active session context to ensure complete tenant security
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized operational execution.');

  // 2. Resolve the matching tenant space profile
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  if (!org) throw new Error('No organizational profile found.');

  // 3. Extract payload details from incoming UI inputs
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const companyName = formData.get('companyName') as string || null;
  const email = formData.get('email') as string || null;

  // 4. Run secure database insert explicitly mapping to the workspace org id
  const { error } = await supabase
    .from('customers')
    .insert([
      {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        email: email,
        organization_id: org.id
      }
    ]);

  if (error) {
    console.error("Supabase Customer Creation Error:", error.message);
    throw new Error(`CRM ingestion failure: ${error.message}`);
  }

  // 5. Instantly clear Next.js caches to render the new account row live
  revalidatePath('/');
}