import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ qrCodeId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { qrCodeId } = await params;
  const supabase = await createServerSupabaseClient();

  // Verify ownership
  const { data: qrCode, error: qrError } = await supabase
    .from('qr_codes')
    .select('id')
    .eq('id', qrCodeId)
    .eq('user_id', user.id)
    .single();

  if (qrError || !qrCode) {
    return NextResponse.json(
      { error: 'QR code not found', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = supabase
    .from('scans_aggregated')
    .select('date, total_scans, unique_ips')
    .eq('qr_code_id', qrCodeId)
    .order('date', { ascending: true });

  if (from) {
    query = query.gte('date', from);
  }
  if (to) {
    query = query.lte('date', to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('analytics timeline error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: (data ?? []).map((row) => ({
      date: row.date,
      totalScans: row.total_scans,
      uniqueVisitors: row.unique_ips,
    })),
  });
}

