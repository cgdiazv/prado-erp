'use server';

import { createClient, createAdminClient } from '@/lib/supabaseServer'; // Imported createAdminClient
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
      console.error("Full Supabase Auth Error Object:", JSON.stringify(authError, null, 2));
      console.error("Auth Error Message String:", authError?.message);
      console.error("Auth Error Status:", authError?.status);
      
      return { error: authError?.message || 'Authentication signup failed.' };
    }

    // 2. Create the Organization profile using the RLS-bypassing Admin Client
    const supabaseAdmin = createAdminClient();
    
    const { error: orgError } = await supabaseAdmin
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
      console.error("Supabase Database Org Error (Admin Override):", orgError.message);
      return { error: orgError.message };
    }

  } catch (err: unknown) {
    console.error("Server Action Fatal Crash:", err);
    return { error: (err as Error)?.message || 'A secure server-side connection error occurred.' };
  }

  // The redirect must happen outside the try/catch block because Next.js
  // implements redirect() by intentionally throwing a navigation error.
  redirect('/signup/check-email');
}

export async function createCustomer(formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Fetch active session context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("CRM FAILURE: No active user session found.");
      return { error: 'Unauthorized operational execution.' };
    }

    // 2. Resolve the matching workspace profile
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
      
    if (orgError || !org) {
      console.error("CRM FAILURE: Could not find organization for user:", user.id, orgError?.message);
      return { error: 'No organizational profile found.' };
    }

    // 3. Extract payload details from incoming UI inputs
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const companyName = formData.get('companyName') as string || null;
    const email = formData.get('email') as string || null;

    console.log(`CRM ATTEMPT: Inserting customer ${firstName} ${lastName} into org ${org.id}`);

    // 4. Run secure database insert using the Admin client to bypass RLS entirely
    const supabaseAdmin = createAdminClient();
    const { data, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          email: email,
          organization_id: org.id
        }
      ])
      .select();

    if (insertError) {
      console.error("CRM CRITICAL: Supabase Database Rejection:", insertError.message);
      return { error: `Database insertion failed: ${insertError.message}` };
    }

    console.log("CRM SUCCESS: Customer successfully committed to database:", data);

    // 5. Instantly clear Next.js caches to render the new account row live
    revalidatePath('/');
    return { success: true };
    
  } catch (err: unknown) {
    console.error("CRM FATAL: Server Action Execution Crash:", err);
    return { error: (err as Error)?.message || 'A fatal backend connection error occurred.' };
  }
}