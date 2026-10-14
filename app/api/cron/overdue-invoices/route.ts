import { NextResponse } from 'next/server';
import { processOverdueInvoiceReminders } from '@/lib/invoiceReminders';

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET || process.env.INVOICE_REMINDERS_CRON_SECRET;
  if (!expectedSecret) {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }

  const cronHeader = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : null;

  return cronHeader === expectedSecret || bearerToken === expectedSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const minDaysParam = url.searchParams.get('minDays');
    const batchSizeParam = url.searchParams.get('batchSize');

    const result = await processOverdueInvoiceReminders({
      minDaysBetweenReminders: minDaysParam ? Number(minDaysParam) : undefined,
      batchSize: batchSizeParam ? Number(batchSizeParam) : undefined,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || 'Failed to process overdue invoice reminders.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
