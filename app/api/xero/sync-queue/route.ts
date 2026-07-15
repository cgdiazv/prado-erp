import { NextResponse } from 'next/server';
import { processPendingXeroSyncQueue } from '@/app/actions/xeroActions';

function isAuthorized(request: Request) {
  const expectedSecret = process.env.XERO_SYNC_CRON_SECRET;
  if (!expectedSecret) {
    return true;
  }

  const cronHeader = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : null;

  return cronHeader === expectedSecret || bearerToken === expectedSecret;
}

function parseBatchSize(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.max(1, Math.min(500, Math.floor(numeric)));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let batchSize = 100;

  try {
    const url = new URL(request.url);
    if (url.searchParams.get('batchSize')) {
      batchSize = parseBatchSize(url.searchParams.get('batchSize'));
    } else {
      const body = await request.json().catch(() => ({}));
      batchSize = parseBatchSize(body?.batchSize);
    }
  } catch {
    batchSize = 100;
  }

  const result = await processPendingXeroSyncQueue(batchSize);
  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
