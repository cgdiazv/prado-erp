import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';

type ExportEntity = 'customers' | 'jobs' | 'expenses' | 'estimates';

function isExportEntity(value: string | null): value is ExportEntity {
  return value === 'customers' || value === 'jobs' || value === 'expenses' || value === 'estimates';
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerLine = headers.join(',');
  const lines = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','));
  return [headerLine, ...lines].join('\n');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityParam = searchParams.get('entity');

    if (!isExportEntity(entityParam)) {
      return new NextResponse('Invalid export entity.', { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { organization: org, role } = await getUserOrganization(user.id);
    if (!org) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    const normalizedRole = (role || '').toLowerCase();
    if (normalizedRole !== 'owner' && normalizedRole !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    let headers: string[] = [];
    let rows: Array<Record<string, unknown>> = [];

    if (entityParam === 'customers') {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email, phone, billing_address, organization_id')
        .eq('organization_id', org.id)
        .order('last_name', { ascending: true });

      if (error) {
        return new NextResponse(error.message, { status: 500 });
      }

      headers = ['id', 'first_name', 'last_name', 'company_name', 'email', 'phone', 'billing_address', 'organization_id'];
      rows = (data || []) as Array<Record<string, unknown>>;
    }

    if (entityParam === 'expenses') {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, organization_id, expense_date, category, amount, vendor, description')
        .eq('organization_id', org.id)
        .order('expense_date', { ascending: false });

      if (error) {
        return new NextResponse(error.message, { status: 500 });
      }

      headers = ['id', 'organization_id', 'expense_date', 'category', 'amount', 'vendor', 'description'];
      rows = (data || []) as Array<Record<string, unknown>>;
    }

    if (entityParam === 'estimates') {
      const { data, error } = await supabase
        .from('estimates')
        .select('id, organization_id, customer_id, property_id, title, description, estimated_amount, status')
        .eq('organization_id', org.id)
        .order('id', { ascending: false });

      if (error) {
        return new NextResponse(error.message, { status: 500 });
      }

      headers = ['id', 'organization_id', 'customer_id', 'property_id', 'title', 'description', 'estimated_amount', 'status'];
      rows = (data || []) as Array<Record<string, unknown>>;
    }

    if (entityParam === 'jobs') {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name')
        .eq('organization_id', org.id);

      if (customersError) {
        return new NextResponse(customersError.message, { status: 500 });
      }

      const customerIds = (customers || []).map((customer) => customer.id);
      const { data: properties, error: propertiesError } = customerIds.length
        ? await supabase
            .from('properties')
            .select('id, customer_id, street_address, city, state, zip_code')
            .in('customer_id', customerIds)
        : { data: [], error: null as { message?: string } | null };

      if (propertiesError) {
        return new NextResponse(propertiesError.message || 'Failed to load properties.', { status: 500 });
      }

      const propertyIds = (properties || []).map((property) => property.id);
      const { data: jobs, error: jobsError } = propertyIds.length
        ? await supabase
            .from('jobs')
            .select('id, property_id, scheduled_date, job_type, cost_amount, notes, status, truck_id')
            .in('property_id', propertyIds)
            .order('scheduled_date', { ascending: true })
        : { data: [], error: null as { message?: string } | null };

      if (jobsError) {
        return new NextResponse(jobsError.message || 'Failed to load jobs.', { status: 500 });
      }

      const customerNameById = new Map<string, string>();
      (customers || []).forEach((customer) => {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || 'Unknown';
        customerNameById.set(customer.id, name);
      });

      const propertyMetaById = new Map<string, { customerName: string; address: string }>();
      (properties || []).forEach((property) => {
        const addressParts = [property.street_address, property.city, property.state, property.zip_code].filter(Boolean);
        propertyMetaById.set(property.id, {
          customerName: customerNameById.get(property.customer_id) || 'Unknown',
          address: addressParts.join(', '),
        });
      });

      headers = [
        'id',
        'property_id',
        'customer_name',
        'property_address',
        'scheduled_date',
        'job_type',
        'cost_amount',
        'notes',
        'status',
        'truck_id',
      ];

      rows = (jobs || []).map((job) => {
        const propertyMeta = propertyMetaById.get(job.property_id);
        return {
          id: job.id,
          property_id: job.property_id,
          customer_name: propertyMeta?.customerName || '',
          property_address: propertyMeta?.address || '',
          scheduled_date: job.scheduled_date,
          job_type: job.job_type,
          cost_amount: job.cost_amount,
          notes: job.notes,
          status: job.status,
          truck_id: job.truck_id,
        };
      });
    }

    const csv = toCsv(headers, rows);
    const filename = `${entityParam}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export CSV.';
    return new NextResponse(message, { status: 500 });
  }
}
