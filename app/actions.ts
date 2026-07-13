'use server';

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';

export async function createJob(formData: FormData) {
  const propertyId = formData.get('propertyId') as string;
  const scheduledDate = formData.get('scheduledDate') as string;
  const jobType = formData.get('jobType') as string;
  const costAmount = parseFloat(formData.get('costAmount') as string || '0');
  const notes = formData.get('notes') as string;
  const truckId = formData.get('truckId') as string || null;

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
        status: 'scheduled',
        truck_id: truckId ? truckId : null 
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

  // 1. Fetch job details AND include nested customer profile information for email delivery
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('*, properties(customer_id, customers(first_name, last_name, email, company_name))')
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
  const customerMeta = (job.properties as any).customers; 
  
  // Set the invoice due date to today (due immediately upon completion)
  const todayStr = new Date().toISOString().split('T')[0];

  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert([
      {
        customer_id: customerId,
        due_date: todayStr,
        status: 'unpaid',
        total_amount: total,
        tax_amount: estimatedTax
      }
    ]);

  if (invoiceError) return { error: invoiceError.message };

  // 4. EMAIL AUTOMATION ENGINE: Dispatches invoice instantly via Resend if email is verified
  if (customerMeta?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: 'notifications@indevasa.com', // Using your verified domain identity
        to: customerMeta.email,
        subject: `Invoice for Completed Service - ${job.job_type}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; color: #334155; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-bottom: 4px;">Service Invoice</h2>
            <p style="font-size: 14px; color: #64748b; margin-top: 0;">Thank you for your business!</p>
            
            <p style="font-size: 14px; margin-top: 20px;">Hi ${customerMeta.first_name},</p>
            <p style="font-size: 14px;">Your <strong>${job.job_type}</strong> service has been successfully completed. Below is the itemized billing breakdown for your records. Payment is due now that the service is finished:</p>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #475569;"><strong>Service Rendered:</strong></td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a;">${job.job_type}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Base Amount:</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a;">$${cost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Estimated Tax (8.25%):</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a;">$${estimatedTax.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0; font-size: 16px;">
                  <td style="padding: 12px 0 0 0; color: #0f172a;"><strong>Total Due:</strong></td>
                  <td style="padding: 12px 0 0 0; text-align: right; color: #059669;"><strong>$${total.toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              Please arrange payment at your earliest convenience. Thank you!
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('⚠️ Invoice recorded in database, but Resend pipe failed to deliver message:', emailErr);
    }
  }

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const companyName = formData.get('companyName') as string || null;
    const email = formData.get('email') as string || null;
    const phone = formData.get('phone') as string || null;
    const billingAddress = formData.get('billingAddress') as string || null;

    if (!firstName || !lastName) return { error: 'Missing required fields.' };

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const streetAddress = formData.get('streetAddress') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const zipCode = formData.get('zipCode') as string;
    const serviceNotes = formData.get('serviceNotes') as string || null;

    if (!streetAddress || !city || !state || !zipCode) {
      return { error: 'Missing required address fields.' };
    }

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
          latitude: latitude,   
          longitude: longitude  
        }
      ]);

    if (insertError) {
      console.error("PROPERTY CRITICAL REJECTION:", insertError.message);
      return { error: insertError.message };
    }

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (error) return { error: error.message };

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoiceId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/customers/${customerId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update invoice status.' };
  }
}

export async function submitSupportTicket(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const urgency = formData.get('urgency') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !message) {
    return { error: 'Please fill out all required fields.' };
  }

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