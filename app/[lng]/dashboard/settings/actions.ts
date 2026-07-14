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

export async function updateWorkspaceIdentity(formData: FormData) {
  const slogan = (formData.get('slogan') as string | null)?.trim() || '';
  const phone = (formData.get('phone') as string | null)?.trim() || '';
  const streetAddress = (formData.get('streetAddress') as string | null)?.trim() || '';
  const city = (formData.get('city') as string | null)?.trim() || '';
  const state = (formData.get('state') as string | null)?.trim() || '';
  const zipCode = (formData.get('zipCode') as string | null)?.trim() || '';
  const locale = (formData.get('locale') as string | null)?.trim() || 'en';
  const logoFile = formData.get('logoFile');
  const removeLogo = (formData.get('removeLogo') as string | null) === 'true';

  if (phone.length > 50) {
    return { error: 'Phone must be 50 characters or fewer.' };
  }

  if (slogan.length > 160) {
    return { error: 'Slogan must be 160 characters or fewer.' };
  }

  if (streetAddress.length > 255) {
    return { error: 'Street address must be 255 characters or fewer.' };
  }

  if (city.length > 120) {
    return { error: 'City must be 120 characters or fewer.' };
  }

  if (state.length > 120) {
    return { error: 'State must be 120 characters or fewer.' };
  }

  if (zipCode.length > 20) {
    return { error: 'ZIP code must be 20 characters or fewer.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in to update workspace identity.' };
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, logo_url')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (orgError) {
    return { error: `Failed to load workspace: ${orgError.message}` };
  }

  if (!org) {
    return { error: 'Workspace not found.' };
  }

  let nextLogoUrl = org.logo_url || null;
  const bucket = process.env.SUPABASE_ORG_LOGOS_BUCKET || 'organization-logos';

  function getStoragePathFromPublicUrl(publicUrl: string | null, bucketName: string): string | null {
    if (!publicUrl) return null;

    const marker = `/storage/v1/object/public/${bucketName}/`;
    const markerIndex = publicUrl.indexOf(marker);

    if (markerIndex === -1) return null;

    return publicUrl.substring(markerIndex + marker.length);
  }

  const previousLogoPath = getStoragePathFromPublicUrl(org.logo_url || null, bucket);

  if (logoFile instanceof File && logoFile.size > 0) {
    const maxSizeBytes = 3 * 1024 * 1024;
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

    if (!allowedTypes.has(logoFile.type)) {
      return { error: 'Invalid logo format. Use PNG, JPG, WEBP, or SVG.' };
    }

    if (logoFile.size > maxSizeBytes) {
      return { error: 'Logo image must be 3MB or smaller.' };
    }

    const extensionFromType =
      logoFile.type === 'image/png'
        ? 'png'
        : logoFile.type === 'image/jpeg'
          ? 'jpg'
          : logoFile.type === 'image/webp'
            ? 'webp'
            : logoFile.type === 'image/svg+xml'
              ? 'svg'
              : 'png';
    const extension = logoFile.name.split('.').pop()?.toLowerCase() || extensionFromType;
    const objectPath = `${org.id}/logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, logoFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: logoFile.type,
      });

    if (uploadError) {
      return { error: `Failed to upload logo: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    nextLogoUrl = publicUrlData.publicUrl || null;

    if (previousLogoPath && previousLogoPath !== objectPath) {
      await supabase.storage.from(bucket).remove([previousLogoPath]);
    }
  } else if (removeLogo && previousLogoPath) {
    await supabase.storage.from(bucket).remove([previousLogoPath]);
    nextLogoUrl = null;
  } else if (removeLogo) {
    nextLogoUrl = null;
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      slogan,
      phone,
      street_address: streetAddress,
      city,
      state,
      zip_code: zipCode,
      logo_url: nextLogoUrl,
    })
    .eq('id', org.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath(`/${locale}/dashboard/settings`);
  return { success: true, logoUrl: nextLogoUrl };
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
