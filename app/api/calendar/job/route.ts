import { NextResponse } from 'next/server';
import { generateICS } from '@/lib/icsExport';

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'job';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get('id') || '';
  const scheduledDate = searchParams.get('scheduledDate') || '';
  const jobType = searchParams.get('jobType') || '';
  const address = searchParams.get('address') || '';
  const truckName = searchParams.get('truckName') || '';
  const costAmount = searchParams.get('costAmount') || '';

  if (!id || !scheduledDate || !jobType) {
    return NextResponse.json({ error: 'Missing required calendar fields.' }, { status: 400 });
  }

  const ics = generateICS({
    id,
    scheduled_date: scheduledDate,
    job_type: jobType,
    street_address: address || null,
    truck_name: truckName || null,
    cost_amount: costAmount || null,
  });

  const fileName = `${sanitizeFilePart(jobType)}-${scheduledDate}.ics`;

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}