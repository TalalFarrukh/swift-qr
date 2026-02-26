import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: 'Billing portal is not implemented yet. Plan changes are currently handled manually.',
      code: 'PORTAL_NOT_IMPLEMENTED',
    },
    { status: 501 },
  );
}

