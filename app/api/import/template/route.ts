import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';

type ImportEntity = 'customers' | 'jobs' | 'expenses' | 'estimates';

function isImportEntity(value: string | null): value is ImportEntity {
  return value === 'customers' || value === 'jobs' || value === 'expenses' || value === 'estimates';
}

const templates: Record<ImportEntity, { headers: string[]; sample: string[] }> = {
  customers: {
    headers: ['first_name', 'last_name', 'company_name', 'email', 'phone', 'billing_address'],
    sample: ['Jane', 'Doe', 'Acme Services', 'jane@example.com', '+1 555-0123', '123 Main St, Dallas, TX 75201'],
  },
  jobs: {
    headers: ['property_id', 'scheduled_date', 'job_type', 'cost_amount', 'notes', 'status', 'truck_id'],
    sample: ['property_uuid_here', '2026-07-14', 'Lawn Maintenance', '150.00', 'Front and back yard service', 'scheduled', 'truck_uuid_here'],
  },
  expenses: {
    headers: ['expense_date', 'category', 'amount', 'vendor', 'description'],
    sample: ['2026-07-14', 'Fuel', '85.40', 'Shell', 'Weekly fill-up for trucks'],
  },
  estimates: {
    headers: ['customer_id', 'property_id', 'title', 'description', 'estimated_amount', 'status'],
    sample: ['customer_uuid_here', 'property_uuid_here', 'Roof Repair', 'Replace damaged shingles', '950.00', 'draft'],
  },
};

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { organization: org, role } = await getUserOrganization(user.id);
  if (!org) {
    return new NextResponse('Organization not found.', { status: 404 });
  }

  const normalizedRole = (role || '').toLowerCase();
  if (normalizedRole !== 'owner' && normalizedRole !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity');

  if (!isImportEntity(entity)) {
    return new NextResponse('Invalid import template entity.', { status: 400 });
  }

  const template = templates[entity];
  const csv = [
    template.headers.map(csvEscape).join(','),
    template.sample.map(csvEscape).join(','),
  ].join('\n');

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entity}-template.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
