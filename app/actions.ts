'use server';

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import EstimateEmail from '@/emails/estimate-email';

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        tax_amount: estimatedTax,
      },
    ]);

  if (invoiceError) return { error: invoiceError.message };

  // 4. EMAIL AUTOMATION ENGINE: Dispatches invoice instantly via Resend if email is verified
  if (customerMeta?.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const replyToAddress = user?.email || process.env.RESEND_REPLY_TO_EMAIL || undefined;
    try {
      await resend.emails.send({
        from: 'notifications@indevasa.com', // Using your verified domain identity
        to: customerMeta.email,
        replyTo: replyToAddress,
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
  const phone = formData.get('phone') as string;
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
        phone: phone || null,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const replyToAddress = user?.email || email || process.env.RESEND_REPLY_TO_EMAIL || undefined;

  try {
    const { error } = await resend.emails.send({
      from: 'notifications@indevasa.com',
      to: 'support@pradojob.com',
      subject: `[${urgency.toUpperCase()} SUPPORT TICKET] From ${name}`,
      replyTo: replyToAddress,
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

// ==========================================
// MÓDULO DE ESTIMACIONES (ESTIMATES)
// ==========================================

export async function createEstimate(formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Verificar sesión de usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    // 2. Resolver organización
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    // 3. Extraer datos
    const customerId = formData.get('customerId') as string;
    const propertyId = formData.get('propertyId') as string || null;
    let title = formData.get('title') as string;
    let description = formData.get('description') as string || '';
    let estimatedAmount = parseFloat(formData.get('estimatedAmount') as string || '0');

    const lineItemsRaw = formData.get('lineItemsJson') as string | null;
    if (lineItemsRaw) {
      try {
        const parsed = JSON.parse(lineItemsRaw) as Array<{ name: string; price: number }>;
        const validLineItems = parsed.filter(
          (item) => typeof item?.name === 'string' && item.name.trim().length > 0 && Number(item.price) > 0
        );

        if (validLineItems.length > 0) {
          estimatedAmount = validLineItems.reduce((sum, item) => sum + Number(item.price), 0);

          if (!title || !title.trim()) {
            title =
              validLineItems.length === 1
                ? validLineItems[0].name.trim()
                : `Estimate with ${validLineItems.length} services`;
          }

          if (!description || !description.trim()) {
            description =
              'Service breakdown:\n' +
              validLineItems
                .map((item) => `- ${item.name.trim()}: $${Number(item.price).toFixed(2)}`)
                .join('\n');
          }
        }
      } catch {
        // Ignore malformed line items payload and continue with base fields.
      }
    }

    if (!customerId || !title || estimatedAmount <= 0) {
      return { error: 'Missing required parameters or invalid amount.' };
    }

    // 4. Insertar en base de datos
    const { error } = await supabase
      .from('estimates')
      .insert([
        {
          organization_id: org.id,
          customer_id: customerId,
          property_id: propertyId,
          title,
          description,
          estimated_amount: estimatedAmount,
          status: 'draft'
        }
      ]);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to create estimate.' };
  }
}

export async function updateEstimate(estimateId: string, formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized operational execution.' };

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!org) return { error: 'No organizational profile found.' };

    const customerId = formData.get('customerId') as string;
    const propertyId = (formData.get('propertyId') as string) || null;
    let title = formData.get('title') as string;
    let description = (formData.get('description') as string) || '';
    let estimatedAmount = parseFloat((formData.get('estimatedAmount') as string) || '0');

    const lineItemsRaw = formData.get('lineItemsJson') as string | null;
    if (lineItemsRaw) {
      try {
        const parsed = JSON.parse(lineItemsRaw) as Array<{ name: string; price: number }>;
        const validLineItems = parsed.filter(
          (item) => typeof item?.name === 'string' && item.name.trim().length > 0 && Number(item.price) > 0
        );

        if (validLineItems.length > 0) {
          estimatedAmount = validLineItems.reduce((sum, item) => sum + Number(item.price), 0);

          if (!title || !title.trim()) {
            title =
              validLineItems.length === 1
                ? validLineItems[0].name.trim()
                : `Estimate with ${validLineItems.length} services`;
          }

          if (!description || !description.trim()) {
            description =
              'Service breakdown:\n' +
              validLineItems
                .map((item) => `- ${item.name.trim()}: $${Number(item.price).toFixed(2)}`)
                .join('\n');
          }
        }
      } catch {
        // Ignore malformed line items payload and continue with base fields.
      }
    }

    if (!estimateId || !customerId || !title || estimatedAmount <= 0) {
      return { error: 'Missing required parameters or invalid amount.' };
    }

    const { data: existingEstimate, error: existingEstimateError } = await supabase
      .from('estimates')
      .select('id')
      .eq('id', estimateId)
      .eq('organization_id', org.id)
      .single();

    if (existingEstimateError || !existingEstimate) {
      return { error: existingEstimateError?.message || 'Estimate not found for this organization.' };
    }

    const { error } = await supabase
      .from('estimates')
      .update({
        customer_id: customerId,
        property_id: propertyId,
        title,
        description,
        estimated_amount: estimatedAmount,
      })
      .eq('id', estimateId)
      .eq('organization_id', org.id);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update estimate.' };
  }
}

export async function sendEstimateByEmail(estimateId: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing.');
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Fetch Estimate and related Customer data
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(
        `
        *,
        customers (
          email,
          first_name,
          last_name
        )
      `
      )
      .eq('id', estimateId)
      .single();

    if (estimateError || !estimate) {
      throw new Error('Estimate not found.');
    }

    const customer = estimate.customers as { email: string; first_name: string; last_name: string };
    if (!customer || !customer.email) {
      throw new Error('Customer email not found for this estimate.');
    }

    // 2. Send email using Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Prado ERP <notifications@indevasa.com>';
    const replyToAddress = user?.email || process.env.RESEND_REPLY_TO_EMAIL || undefined;
    const emailHtml = await render(
      EstimateEmail({
        customerName: `${customer.first_name} ${customer.last_name}`,
        estimate: estimate as any,
      })
    );

    const { error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: [customer.email],
      replyTo: replyToAddress,
      subject: `Your Estimate: ${estimate.title}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // 3. Update estimate status to 'sent'
    const { error: updateError } = await supabase.from('estimates').update({ status: 'sent' }).eq('id', estimateId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw new Error('Email sent, but failed to update estimate status.');
    }

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`[sendEstimateByEmail]: ${message}`);
    return { error: message };
  }
}

export async function getEstimatesDashboardData() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized', estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subscription_status')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      return { error: orgError?.message || 'Organization not found.', estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: estimatesData, error: estimatesError } = await supabase
      .from('estimates')
      .select('*, customers(id, first_name, last_name, company_name), properties(id, street_address, city)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    if (estimatesError) {
      return { error: estimatesError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name')
      .eq('organization_id', org.id)
      .order('last_name', { ascending: true });

    if (customersError) {
      return { error: customersError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('id, name, base_price')
      .eq('organization_id', org.id)
      .order('name', { ascending: true });

    if (servicesError) {
      return { error: servicesError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    const { data: trucksData, error: trucksError } = await supabase
      .from('trucks')
      .select('id, name, plate_number, is_active, status')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (trucksError) {
      return { error: trucksError.message, estimates: [], customers: [], services: [], trucks: [] };
    }

    return {
      success: true,
      organizationName: org.name || '',
      subscriptionStatus: org.subscription_status || 'trial',
      estimates: estimatesData || [],
      customers: customersData || [],
      services: servicesData || [],
      trucks: trucksData || [],
    };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to fetch estimates dashboard data.', estimates: [], customers: [], services: [], trucks: [] };
  }
}

export async function getEstimateCustomerProperties(customerId: string) {
  try {
    if (!customerId) return { success: true, properties: [] };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized', properties: [] };

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (orgError || !org) {
      return { error: orgError?.message || 'Organization not found.', properties: [] };
    }

    // Validate the selected customer belongs to this organization before loading properties.
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('organization_id', org.id)
      .single();

    if (customerError || !customer) {
      return { error: customerError?.message || 'Customer not found for this organization.', properties: [] };
    }

    const { data, error } = await supabase
      .from('properties')
      .select('id, street_address, city')
      .eq('customer_id', customerId);

    if (error) return { error: error.message, properties: [] };

    return { success: true, properties: data || [] };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to fetch customer properties.', properties: [] };
  }
}

// Cambiar estado de la estimación (draft -> sent -> approved/declined)
export async function updateEstimateStatus(estimateId: string, newStatus: 'draft' | 'sent' | 'approved' | 'declined') {
  if (!estimateId) return { error: 'Missing Estimate ID' };

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('estimates')
      .update({ status: newStatus })
      .eq('id', estimateId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard/estimates');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Failed to update status.' };
  }
}

// AUTOMATIZACIÓN: Convertir estimación aprobada en un Job agendado automáticamente
export async function convertEstimateToJob(estimateId: string, scheduledDate: string, truckId?: string | null) {
  if (!estimateId || !scheduledDate) return { error: 'Missing parameters.' };

  try {
    const supabase = await createClient();

    // 1. Obtener la estimación
    const { data: estimate, error: fetchError } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', estimateId)
      .single();

    if (fetchError || !estimate) {
      return { error: fetchError?.message || 'Estimate not found.' };
    }

    if (estimate.status !== 'approved') {
      return { error: 'Only approved estimates can be converted to jobs.' };
    }

    // 2. Insertar el nuevo Job basado en los datos de la estimación
    const { error: jobError } = await supabase
      .from('jobs')
      .insert([
        {
          property_id: estimate.property_id,
          scheduled_date: scheduledDate,
          job_type: estimate.title, // El título de la cotización pasa a ser el servicio
          cost_amount: estimate.estimated_amount,
          notes: `Convertido automáticamente desde Cotización. Notas originales:\n${estimate.description || 'Ninguna.'}`,
          status: 'scheduled',
          truck_id: truckId || null
        }
      ]);

    if (jobError) return { error: jobError.message };

    revalidatePath('/dashboard/jobs');
    revalidatePath('/dashboard/estimates');
    revalidatePath('/dashboard/schedule');
    revalidatePath('/dashboard/routing');
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error)?.message || 'Conversion pipeline failed.' };
  }
}