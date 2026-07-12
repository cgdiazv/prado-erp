'use server';

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function createJob(formData: FormData) {
  const propertyId = formData.get('propertyId') as string;
  const scheduledDate = formData.get('scheduledDate') as string;
  const jobType = formData.get('jobType') as string;
  const costAmount = parseFloat(formData.get('costAmount') as string || '0');
  const notes = formData.get('notes') as string;

  if (!propertyId || !scheduledDate || !jobType) {
    return { error: 'Missing required fields' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('jobs')
    .insert([
      {
        property_id: propertyId,
        scheduled_date: scheduledDate,
        job_type: jobType,
        cost_amount: costAmount,
        notes: notes,
        status: 'scheduled'
      }
    ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export async function completeJob(jobId: string) {
  if (!jobId) return { error: 'Missing Job ID' };

  const supabase = await createClient();

  // 1. Fetch the job details to know the cost, and find the customer through the property relation
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('*, properties(customer_id)')
    .eq('id', jobId)
    .single();

  if (fetchError || !job) {
    return { error: fetchError?.message || 'Job not found' };
  }

  // 2. Update the job status to 'completed'
  const { error: updateError } = await supabase
    .from('jobs')
    .update({ status: 'completed' })
    .eq('id', jobId);

  if (updateError) return { error: updateError.message };

  // 3. Bookkeeping Automation: Auto-generate the customer invoice
  const cost = job.cost_amount;
  const estimatedTax = parseFloat((cost * 0.0825).toFixed(2)); // Standard 8.25% tax rate example
  const total = parseFloat((cost + estimatedTax).toFixed(2));
  if (!job.properties) {
    return { error: 'Job properties not found' };
  }
  const customerId = job.properties.customer_id;
  
  // Set the invoice due date for 15 days out (Net 15 terms)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert([
      {
        customer_id: customerId,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'unpaid',
        total_amount: total,
        tax_amount: estimatedTax
      }
    ]);

  if (invoiceError) return { error: invoiceError.message };

  revalidatePath('/');
  return { success: true };
}

export async function createExpense(formData: FormData) {
  const expenseDate = formData.get('expenseDate') as string;
  const category = formData.get('category') as string;
  const amount = parseFloat(formData.get('amount') as string || '0');
  const vendor = formData.get('vendor') as string;
  const description = formData.get('description') as string;

  if (!expenseDate || !category || amount <= 0) {
    return { error: 'Missing or invalid expense parameters' };
  }

  const supabase = await createClient();
  
  // Resolve active user context to tag the expense to the correct organization profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized operational execution.' };

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!org) return { error: 'No organizational profile found.' };

  const { error } = await supabase
    .from('expenses')
    .insert([
      {
        expense_date: expenseDate,
        category,
        amount,
        vendor,
        description,
        organization_id: org.id
      }
    ]);

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function createCustomer(formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const companyName = formData.get('companyName') as string;
  const email = formData.get('email') as string;
  const organizationId = formData.get('organizationId') as string;

  if (!firstName || !lastName || !organizationId) {
    return { error: 'Missing required customer fields' };
  }

  // Use the admin client to bypass the pending email verification status constraint completely
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('customers')
    .insert([
      {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName || null,
        email: email || null,
        organization_id: organizationId
      }
    ]);

  if (error) {
    console.error("Supabase Insertion Error details:", error.message);
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateCustomer(customerId: string, formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Verify session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    // 2. Resolve organization context to verify ownership
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    // 3. Extract payload details including phone and billingAddress
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const companyName = formData.get('companyName') as string || null;
    const email = formData.get('email') as string || null;
    const phone = formData.get('phone') as string || null;
    const billingAddress = formData.get('billingAddress') as string || null;

    if (!firstName || !lastName) return { error: 'Missing required fields.' };

    // 4. Update the customer record securely
    const { error } = await supabase
      .from('customers')
      .update({
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        email: email,
        phone: phone,
        billing_address: billingAddress
      })
      .eq('id', customerId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update customer.' };
  }
}

export async function deleteCustomer(customerId: string) {
  try {
    const supabase = await createClient();

    // 1. Verify session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    // 2. Resolve organization context to verify ownership
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    // 3. Delete row ensuring it strictly belongs to this user's organization
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to delete customer.' };
  }
}

export async function createProperty(customerId: string, formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Verify user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    // 2. Extract address input details
    const streetAddress = formData.get('streetAddress') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const zipCode = formData.get('zipCode') as string;
    const serviceNotes = formData.get('serviceNotes') as string || null;

    if (!streetAddress || !city || !state || !zipCode) {
      return { error: 'Missing required address fields.' };
    }

    // --- NEW MODIFICATION: GEOLOCATION COORDINATES ENGINE ---
    let latitude: number | null = null;
    let longitude: number | null = null;
    
    const fullAddressString = `${streetAddress}, ${city}, ${state} ${zipCode}`;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddressString)}&key=${apiKey}`
        );
        const geocodeData = await response.json();

        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          const location = geocodeData.results[0].geometry.location;
          latitude = location.lat;
          longitude = location.lng;
        } else {
          console.warn(`⚠️ Geocoding resolution failed for: ${fullAddressString}. Status: ${geocodeData.status}`);
        }
      } catch (geoError) {
        console.error('❌ Google Geocoding API execution failure:', geoError);
      }
    } else {
      console.warn('⚠️ Geocoding skipped: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment token missing.');
    }
    // --------------------------------------------------------

    // 3. Use createAdminClient to bypass RLS restrictions and write cleanly with coordinates
    const supabaseAdmin = createAdminClient();
    const { error: insertError } = await supabaseAdmin
      .from('properties')
      .insert([
        {
          street_address: streetAddress,
          city,
          state,
          zip_code: zipCode,
          service_notes: serviceNotes,
          customer_id: customerId,
          latitude: latitude,   // Writes to database layout dynamically
          longitude: longitude  // Writes to database layout dynamically
        }
      ]);

    if (insertError) {
      console.error("PROPERTY CRITICAL REJECTION:", insertError.message);
      return { error: insertError.message };
    }

    // 4. Instantly clear Next.js data caches to render updates across layouts
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/'); 
    return { success: true };
  } catch (err: unknown) {
    console.error("PROPERTY FATAL EXCEPTION:", err);
    return { error: (err as Error)?.message || 'Failed to register service site.' };
  }
}

export async function deleteJob(jobId: string) {
  if (!jobId) return { error: 'Missing Job ID' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function deleteProperty(propertyId: string, customerId: string) {
  if (!propertyId) return { error: 'Missing Property ID' };

  try {
    const supabase = await createClient();

    // 1. Verify user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    // 2. Delete row securely
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (error) return { error: error.message };

    // 3. Revalidate path layers to instantly clear from interface view
    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to remove service site.' };
  }
}

export async function markInvoiceAsPaid(invoiceId: string, customerId: string) {
  if (!invoiceId) return { error: 'Missing Invoice ID' };

  try {
    const supabase = await createClient();

    // 1. Verify user session context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    // 2. Perform database mutation to flip status to paid
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoiceId);

    if (error) return { error: error.message };

    // 3. Revalidate paths to instantly visually update ledger rows
    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update invoice status.' };
  }
}

import { Resend } from 'resend';

export async function submitSupportTicket(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const urgency = formData.get('urgency') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !message) {
    return { error: 'Please fill out all required fields.' };
  }

  // Fallback to checking process.env.RESEND_API_KEY internally
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: 'notifications@indevasa.com',
      to: 'support@pradojob.com',
      subject: `[${urgency.toUpperCase()} SUPPORT TICKET] From ${name}`,
      replyTo: email,
      html: `
        <h2>New Support Hub Ticket Recieved</h2>
        <p><strong>Operator Name:</strong> ${name}</p>
        <p><strong>Reply-To Email:</strong> ${email}</p>
        <p><strong>Urgency Tier:</strong> ${urgency}</p>
        <p><strong>Operational Message Log:</strong></p>
        <blockquote style="background: #f4f4f5; padding: 12px; border-left: 4px solid #10b981; border-radius: 4px;">
          ${message.replace(/\n/g, '<br />')}
        </blockquote>
      `,
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to dispatch ticket pipeline.' };
  }
}

export async function hideDemoRecord(recordId: string, returnPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('deleted_demo_records')
    .insert({ user_id: user.id, record_id: recordId });

  if (error) return { error: error.message };

  revalidatePath(returnPath);
  return { success: true };
}