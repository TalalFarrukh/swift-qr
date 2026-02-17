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

  const { data, error } = await supabase
    .from('scans_aggregated')
    .select('device_breakdown, os_breakdown, browser_breakdown')
    .eq('qr_code_id', qrCodeId)
    .order('date', { ascending: false })
    .limit(30);

  if (error) {
    console.error('analytics devices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device analytics', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }

  const deviceTotals: Record<string, number> = {};
  const osTotals: Record<string, number> = {};
  const browserTotals: Record<string, number> = {};

  for (const row of data ?? []) {
    const device = (row.device_breakdown as Record<string, number> | null) ?? {};
    for (const [key, value] of Object.entries(device)) {
      deviceTotals[key] = (deviceTotals[key] ?? 0) + (value ?? 0);
    }

    const os = (row.os_breakdown as Record<string, number> | null) ?? {};
    for (const [key, value] of Object.entries(os)) {
      osTotals[key] = (osTotals[key] ?? 0) + (value ?? 0);
    }

    const browser = (row.browser_breakdown as Record<string, number> | null) ?? {};
    for (const [key, value] of Object.entries(browser)) {
      browserTotals[key] = (browserTotals[key] ?? 0) + (value ?? 0);
    }
  }

  return NextResponse.json({
    device: deviceTotals,
    os: osTotals,
    browser: browserTotals,
  });
}

