import { NextRequest, NextResponse } from 'next/server';
import { aggregateScansForDate } from '@/lib/analytics/aggregator';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? undefined;

  await aggregateScansForDate({ date: date ?? undefined });

  return NextResponse.json({ ok: true });
}

