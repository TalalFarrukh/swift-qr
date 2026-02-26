import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Stripe webhook handling is not implemented yet.',
      code: 'WEBHOOK_NOT_IMPLEMENTED',
    },
    { status: 501 },
  );
}

