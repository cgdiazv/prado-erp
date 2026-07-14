'use server';

import { createClient, createAdminClient } from '@/lib/supabaseServer'; 
import { Resend } from 'resend';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Supabase Login Error:", error.message);
    return { error: error.message };
  }

  // CATCH UNCONFIRMED EMAIL SIGN-IN RESTRICTION:
  // If email confirmation is turned on in Supabase, the user is created but data.session will be null.
  if (!data?.session) {
    return { error: 'Please check your email and confirm your account before logging in.' };
  }

  // Return a clear indicator so the client knows login succeeded
  return { success: true };
}

export async function signup(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const companyName = formData.get('companyName') as string;
    const intendedPlan = formData.get('intendedPlan') as string; // 'trial' | 'individual' | 'growth' | 'enterprise'

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
      return { error: authError?.message || 'Authentication signup failed.' };
    }

    // 2. Create the Organization profile using the RLS-bypassing Admin Client
    const supabaseAdmin = createAdminClient();
    
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert([
        {
          name: companyName,
          owner_id: authData.user.id,
          subscription_status: 'trial', // Always default table state to trial initially for database schema consistency
          trial_starts_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (orgError || !orgData) {
      console.error("Supabase Database Org Error (Admin Override):", orgError?.message);
      return { error: orgError?.message || 'Failed to create workspace profile.' };
    }

    // Notify internal inbox for both trial and paid-intent registrations.
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Prado Alerts <notifications@indevasa.com>',
          to: process.env.ADMIN_ALERT_EMAIL || 'info@pradojob.com',
          subject: `New Prado Registration (${intendedPlan || 'trial'})`,
          html: `
            <h2>New User Registration</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${companyName}</p>
            <p><strong>Intended Plan:</strong> ${intendedPlan || 'trial'}</p>
            <p><strong>Organization ID:</strong> ${orgData.id}</p>
            <p><strong>Created At:</strong> ${new Date().toISOString()}</p>
          `,
        });
      } else {
        console.warn('Registration admin alert skipped: RESEND_API_KEY is not configured.');
      }
    } catch (alertErr) {
      console.error('Registration created, but admin alert email failed:', alertErr);
    }

    // 3. Conditional Branch Routing: Instead of throwing redirects, return target destination instructions
    const queryParams = `prefilled_email=${encodeURIComponent(email)}&client_reference_id=${orgData.id}`;

    if (intendedPlan === 'individual') {
      return { stripeUrl: `https://pay.indevasa.com/b/00wdR85i76E4dXg2Yl4Ni04?${queryParams}` };
    }

    if (intendedPlan === 'growth') {
      return { stripeUrl: `https://pay.indevasa.com/b/9B614m39Z7I84mG6ax4Ni06?${queryParams}` };
    }

    if (intendedPlan === 'enterprise') {
      return { stripeUrl: `https://pay.indevasa.com/b/eVq4gy5i73rS5qKdCZ4Ni05?${queryParams}` };
    }

    // Fallback: Default standard free trial flow routing
    return { redirectTo: '/signup/check-email' };

  } catch (err: unknown) {
    console.error("Server Action Fatal Crash:", err);
    return { error: (err as Error)?.message || 'A secure server-side connection error occurred.' };
  }
}