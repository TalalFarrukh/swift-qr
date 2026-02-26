import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: 'Checkout is not implemented yet. Plans are currently managed manually.',
      code: 'CHECKOUT_NOT_IMPLEMENTED',
    },
    { status: 501 },
  );
}

