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
    const inviteOrgId = formData.get('organization_id') as string; // If present, this is an invite signup

    if (!email || !password || !companyName) {
      return { error: 'All registration fields are required.' };
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. Register the raw user inside Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error("Full Supabase Auth Error Object:", JSON.stringify(authError, null, 2));
      return { error: authError?.message || 'Authentication signup failed.' };
    }

    const userId = authData.user.id;

    // 2. Determine signup type: invite vs regular
    let ownerOrgId = inviteOrgId; // If invite signup, we'll use the inviting org
    let orgData = null;

    // Only create a new organization if this is NOT an invite signup
    if (!inviteOrgId) {
      // Regular signup: create a new organization for this user
      const { data: newOrgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert([
          {
            name: companyName,
            owner_id: userId,
            subscription_status: 'trial',
            trial_starts_at: new Date().toISOString(),
            auto_optimize_drive_routes: false,
          }
        ])
        .select()
        .single();

      if (orgError || !newOrgData) {
        console.error("Supabase Database Org Error (Admin Override):", orgError?.message);
        return { error: orgError?.message || 'Failed to create workspace profile.' };
      }
      
      orgData = newOrgData;
      ownerOrgId = newOrgData.id;
    } else {
      // Invite signup: user joins existing organization, don't create new one
      console.log('Invite signup detected - skipping organization creation');
    }

    // 3. Check for pending team invitations and add user to those organizations
    const { data: pendingInvites } = await supabase
      .from('organization_invitations')
      .select('organization_id, role')
      .eq('email', email)
      .is('accepted_at', null);

    if (pendingInvites && pendingInvites.length > 0) {
      // Add user to each organization they were invited to
      const orgUserInserts = pendingInvites.map(invite => ({
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role,
      }));

      await supabaseAdmin
        .from('organization_users')
        .insert(orgUserInserts);

      // Mark invitations as accepted
      await supabase
        .from('organization_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('email', email)
        .is('accepted_at', null);
      
      console.log(`User ${email} added to ${pendingInvites.length} organization(s)`);
    }

    // 4. Notify internal inbox for registrations.
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const signupType = inviteOrgId ? 'Invite Signup' : 'New Organization';
        await resend.emails.send({
          from: 'Prado Alerts <notifications@indevasa.com>',
          to: process.env.ADMIN_ALERT_EMAIL || 'info@pradojob.com',
          subject: `New Prado Registration - ${signupType} (${intendedPlan || 'trial'})`,
          html: `
            <h2>New User Registration</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${companyName}</p>
            <p><strong>Signup Type:</strong> ${signupType}</p>
            <p><strong>Intended Plan:</strong> ${intendedPlan || 'trial'}</p>
            <p><strong>Organization ID:</strong> ${ownerOrgId}</p>
            <p><strong>Created At:</strong> ${new Date().toISOString()}</p>
          `,
        });
      } else {
        console.warn('Registration admin alert skipped: RESEND_API_KEY is not configured.');
      }
    } catch (alertErr) {
      console.error('Registration created, but admin alert email failed:', alertErr);
    }

    // 5. Conditional Branch Routing: Instead of throwing redirects, return target destination instructions
    // For invite signups, skip Stripe checkout and go straight to login/dashboard
    if (inviteOrgId) {
      return { redirectTo: '/signup/check-email' };
    }

    const queryParams = `prefilled_email=${encodeURIComponent(email)}&client_reference_id=${ownerOrgId}`;

    if (intendedPlan === 'individual') {
      return { stripeUrl: `https://pay.delvalletradings.com/b/00wdR85i76E4dXg2Yl4Ni04?${queryParams}` };
    }

    if (intendedPlan === 'growth') {
      return { stripeUrl: `https://pay.delvalletradings.com/b/9B614m39Z7I84mG6ax4Ni06?${queryParams}` };
    }

    if (intendedPlan === 'enterprise') {
      return { stripeUrl: `https://pay.delvalletradings.com/b/eVq4gy5i73rS5qKdCZ4Ni05?${queryParams}` };
    }

    // Fallback: Default standard free trial flow routing
    return { redirectTo: '/signup/check-email' };

  } catch (err: unknown) {
    console.error("Server Action Fatal Crash:", err);
    return { error: (err as Error)?.message || 'A secure server-side connection error occurred.' };
  }
}

export async function acceptTeamInvitation(formData: FormData) {
  try {
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;

    if (!token || !password) {
      return { error: 'Invitation token and password are required.' };
    }

    const supabaseAdmin = createAdminClient();

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .select('organization_id, email, role, accepted_at')
      .eq('invite_token', token)
      .is('accepted_at', null)
      .maybeSingle();

    if (inviteError || !invite) {
      return { error: 'Invalid or expired invitation link.' };
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((user) => user.email === invite.email) || null;

    let authUserId = existingUser?.id || null;

    if (existingUser) {
      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });

      if (updateUserError) {
        return { error: updateUserError.message };
      }
    } else {
      const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
      });

      if (createUserError || !createdUser.user) {
        return { error: createUserError?.message || 'Failed to create authentication user.' };
      }

      authUserId = createdUser.user.id;
    }

    if (!authUserId) {
      return { error: 'Failed to resolve authentication user.' };
    }

    const { data: existingMembership } = await supabaseAdmin
      .from('organization_users')
      .select('id')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', authUserId)
      .maybeSingle();

    if (!existingMembership) {
      const { error: membershipError } = await supabaseAdmin
        .from('organization_users')
        .insert([
          {
            organization_id: invite.organization_id,
            user_id: authUserId,
            role: invite.role,
          },
        ]);

      if (membershipError) {
        return { error: membershipError.message };
      }
    }

    const { error: acceptError } = await supabaseAdmin
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invite_token', token)
      .is('accepted_at', null);

    if (acceptError) {
      return { error: acceptError.message };
    }

    return { success: true, email: invite.email };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to accept invitation.' };
  }
}