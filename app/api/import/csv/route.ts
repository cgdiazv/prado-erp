import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';

type ImportEntity = 'customers' | 'jobs' | 'expenses' | 'estimates';

type RowRecord = Record<string, string>;

function isImportEntity(value: string | null): value is ImportEntity {
  return value === 'customers' || value === 'jobs' || value === 'expenses' || value === 'estimates';
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function getValue(row: RowRecord, aliases: string[]): string {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim();
    }
  }
  return '';
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOnly(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const entity = formData.get('entity');
    const file = formData.get('file');

    if (typeof entity !== 'string' || !isImportEntity(entity)) {
      return NextResponse.json({ error: 'Invalid import entity.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CSV file is required.' }, { status: 400 });
    }

    const raw = await file.text();
    const content = raw.replace(/^\uFEFF/, '');
    const matrix = parseCsv(content).filter((line) => line.some((cell) => cell.trim() !== ''));

    if (matrix.length < 2) {
      return NextResponse.json({ error: 'CSV must include a header row and at least one data row.' }, { status: 400 });
    }

    const headerRow = matrix[0].map((value) => normalizeHeader(value));
    const dataRows = matrix.slice(1);

    const parsedRows: RowRecord[] = dataRows.map((cells) => {
      const row: RowRecord = {};
      headerRow.forEach((header, index) => {
        row[header] = (cells[index] || '').trim();
      });
      return row;
    });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization: org, role } = await getUserOrganization(user.id);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    const normalizedRole = (role || '').toLowerCase();
    if (normalizedRole !== 'owner' && normalizedRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rowErrors: Array<{ row: number; reason: string }> = [];
    let imported = 0;

    const fail = (rowIndex: number, reason: string) => {
      rowErrors.push({ row: rowIndex + 2, reason });
    };

    const importCustomers = async () => {
      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const firstName = getValue(row, ['first_name', 'firstname', 'firstName']);
        const lastName = getValue(row, ['last_name', 'lastname', 'lastName']);

        if (!firstName || !lastName) {
          fail(i, 'Missing required first_name or last_name.');
          continue;
        }

        const payload = {
          organization_id: org.id,
          first_name: firstName,
          last_name: lastName,
          company_name: getValue(row, ['company_name', 'company']),
          email: getValue(row, ['email']),
          phone: getValue(row, ['phone']),
          billing_address: getValue(row, ['billing_address', 'address']),
        };

        const { error } = await supabase.from('customers').insert([payload]);
        if (error) {
          fail(i, error.message);
          continue;
        }
        imported += 1;
      }
    };

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', org.id);
    const customerIds = new Set((customers || []).map((customer) => customer.id));

    const { data: properties } = customerIds.size
      ? await supabase.from('properties').select('id, customer_id').in('customer_id', Array.from(customerIds))
      : { data: [] as Array<{ id: string; customer_id: string }> };
    const propertyIds = new Set((properties || []).map((property) => property.id));

    const { data: trucks } = await supabase.from('trucks').select('id').eq('organization_id', org.id);
    const truckIds = new Set((trucks || []).map((truck) => truck.id));

    const importExpenses = async () => {
      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const expenseDate = toDateOnly(getValue(row, ['expense_date', 'date']));
        const category = getValue(row, ['category']);
        const amount = toNumber(getValue(row, ['amount']));

        if (!expenseDate || !category || amount === null || amount <= 0) {
          fail(i, 'Missing or invalid expense_date, category, or amount.');
          continue;
        }

        const payload = {
          organization_id: org.id,
          expense_date: expenseDate,
          category,
          amount,
          vendor: getValue(row, ['vendor']),
          description: getValue(row, ['description']),
        };

        const { error } = await supabase.from('expenses').insert([payload]);
        if (error) {
          fail(i, error.message);
          continue;
        }
        imported += 1;
      }
    };

    const importEstimates = async () => {
      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const customerId = getValue(row, ['customer_id', 'customerid']);
        const title = getValue(row, ['title']);
        const estimatedAmount = toNumber(getValue(row, ['estimated_amount', 'amount']));
        const propertyId = getValue(row, ['property_id', 'propertyid']);
        const status = getValue(row, ['status']) || 'draft';

        if (!customerId || !title || estimatedAmount === null || estimatedAmount <= 0) {
          fail(i, 'Missing or invalid customer_id, title, or estimated_amount.');
          continue;
        }

        if (!customerIds.has(customerId)) {
          fail(i, 'customer_id does not belong to your organization.');
          continue;
        }

        if (propertyId && !propertyIds.has(propertyId)) {
          fail(i, 'property_id does not belong to your organization.');
          continue;
        }

        const payload = {
          organization_id: org.id,
          customer_id: customerId,
          property_id: propertyId || null,
          title,
          description: getValue(row, ['description']),
          estimated_amount: estimatedAmount,
          status,
        };

        const { error } = await supabase.from('estimates').insert([payload]);
        if (error) {
          fail(i, error.message);
          continue;
        }
        imported += 1;
      }
    };

    const importJobs = async () => {
      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const propertyId = getValue(row, ['property_id', 'propertyid']);
        const scheduledDate = toDateOnly(getValue(row, ['scheduled_date', 'date']));
        const jobType = getValue(row, ['job_type', 'title', 'service']);
        const costAmount = toNumber(getValue(row, ['cost_amount', 'amount'])) || 0;
        const status = getValue(row, ['status']) || 'scheduled';
        const truckId = getValue(row, ['truck_id', 'truckid']);

        if (!propertyId || !scheduledDate || !jobType) {
          fail(i, 'Missing required property_id, scheduled_date, or job_type.');
          continue;
        }

        if (!propertyIds.has(propertyId)) {
          fail(i, 'property_id does not belong to your organization.');
          continue;
        }

        if (truckId && !truckIds.has(truckId)) {
          fail(i, 'truck_id does not belong to your organization.');
          continue;
        }

        const payload = {
          property_id: propertyId,
          scheduled_date: scheduledDate,
          job_type: jobType,
          cost_amount: costAmount,
          notes: getValue(row, ['notes', 'description']),
          status,
          truck_id: truckId || null,
        };

        const { error } = await supabase.from('jobs').insert([payload]);
        if (error) {
          fail(i, error.message);
          continue;
        }
        imported += 1;
      }
    };

    if (entity === 'customers') await importCustomers();
    if (entity === 'expenses') await importExpenses();
    if (entity === 'estimates') await importEstimates();
    if (entity === 'jobs') await importJobs();

    return NextResponse.json({
      success: true,
      entity,
      totalRows: parsedRows.length,
      imported,
      failed: rowErrors.length,
      errors: rowErrors.slice(0, 25),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import CSV.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
