import { NextRequest, NextResponse } from 'next/server';
import { aggregateScansForDate } from '@/lib/analytics/aggregator';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? undefined;

  await aggregateScansForDate({ date: date ?? undefined });

  return NextResponse.json({ ok: true });
}

