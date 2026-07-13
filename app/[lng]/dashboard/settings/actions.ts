'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { Resend } from 'resend';

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { error: 'Both password fields are strictly required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function createService(name: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be signed in to manage services.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) return { error: 'Workspace not found.' };

    const { data, error } = await supabase
      .from('services')
      .insert([
        {
          organization_id: org.id,
          name,
          base_price: 0
        }
      ])
      .select('id, name, base_price')
      .single();

    if (error) return { error: error.message };

    revalidatePath('/dashboard/settings');
    return { success: true, service: data };
  } catch (error: unknown) {
    return { error: (error as Error)?.message || 'Failed to create service.' };
  }
}

export async function deleteService(serviceId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be signed in to manage services.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) return { error: 'Workspace not found.' };

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: unknown) {
    return { error: (error as Error)?.message || 'Failed to delete service.' };
  }
}

export async function createTruck(name: string, plateNumber: string | null) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be signed in to manage trucks.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) return { error: 'Workspace not found.' };

    const { data, error } = await supabase
      .from('trucks')
      .insert([
        {
          organization_id: org.id,
          name,
          plate_number: plateNumber,
          is_active: true,
          status: 'active'
        }
      ])
      .select('id, name, plate_number, is_active, status')
      .single();

    if (error) return { error: error.message };

    revalidatePath('/dashboard/settings');
    return { success: true, truck: data };
  } catch (error: unknown) {
    return { error: (error as Error)?.message || 'Failed to create truck.' };
  }
}

export async function deactivateTruck(truckId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'You must be signed in to manage trucks.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) return { error: 'Workspace not found.' };

    const { error } = await supabase
      .from('trucks')
      .update({ is_active: false, status: 'inactive' })
      .eq('id', truckId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: unknown) {
    return { error: (error as Error)?.message || 'Failed to deactivate truck.' };
  }
}

export async function cancelSubscription() {
  const supabase = await createClient();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be signed in to cancel a subscription.' };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, subscription_status, stripe_subscription_id')
    .eq('owner_id', user.id)
    .single();

  if (!org) {
    return { error: 'Workspace not found.' };
  }

  if (org.subscription_status === 'trial') {
    return { error: 'This workspace is already on the trial plan.' };
  }

  try {
    // Cancel the subscription in Stripe
    if (org.stripe_subscription_id) {
      await stripe.subscriptions.cancel(org.stripe_subscription_id);
    }

    // Update the database
    const { error: dbError } = await supabase
      .from('organizations')
      .update({ subscription_status: 'trial', stripe_subscription_id: null })
      .eq('id', org.id);

    if (dbError) {
      throw dbError;
    }

    // Send a cancellation email
    if (user.email) {
      await resend.emails.send({
        from: 'Prado <billing@pradosa.com>',
        to: user.email,
        subject: 'Your Prado Subscription Has Been Canceled',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; text-align: left; color: #1e293b;">
            <h2 style="color: #10b981; text-align: center;">Prado Subscription Canceled</h2>
            <p>Hi there,</p>
            <p>Your subscription for the workspace has been successfully canceled. Your workspace has been moved to the trial plan.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>Thanks,</p>
            <p>The Prado Team</p>
          </div>
        `,
      });
    }

    revalidatePath('/dashboard/settings');
    return { success: true };

  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return { error: 'There was an error canceling your subscription. Please contact support.' };
  }
}
