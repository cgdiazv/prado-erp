'use server';

import { supabase } from '@/lib/supabaseClient';
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

  // Tells Next.js to wipe the cache and refresh the main page data instantly
  revalidatePath('/');
  return { success: true };
}

export async function completeJob(jobId: string) {
  if (!jobId) return { error: 'Missing Job ID' };

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
  const customerId = (job.properties as any).customer_id;
  
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

  const { error } = await supabase
    .from('expenses')
    .insert([
      {
        expense_date: expenseDate,
        category,
        amount,
        vendor,
        description
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

  const { error } = await supabase
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

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}