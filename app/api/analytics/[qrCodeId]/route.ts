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

  // Verify ownership and get basic counters.
  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select('id, scan_count, last_scanned_at')
    .eq('id', qrCodeId)
    .eq('user_id', user.id)
    .single();

  if (error || !qrCode) {
    return NextResponse.json(
      { error: 'QR code not found', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  // Fetch recent aggregates (e.g. last 30 days) from scans_aggregated.
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);
  const fromStr = from.toISOString().slice(0, 10);

  const { data: aggregates, error: aggError } = await supabase
    .from('scans_aggregated')
    .select(
      'date, total_scans, unique_ips, top_countries, top_cities, device_breakdown, os_breakdown, browser_breakdown, hourly_distribution',
    )
    .eq('qr_code_id', qrCodeId)
    .gte('date', fromStr)
    .order('date', { ascending: true });

  if (aggError) {
    console.error('analytics aggregate error:', aggError);
  }

  return NextResponse.json({
    totalScans: qrCode.scan_count ?? 0,
    lastScannedAt: qrCode.last_scanned_at ?? null,
    aggregates: aggregates ?? [],
  });
}
