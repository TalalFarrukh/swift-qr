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
    .select('top_countries, top_cities')
    .eq('qr_code_id', qrCodeId)
    .order('date', { ascending: false })
    .limit(30);

  if (error) {
    console.error('analytics locations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }

  // Flatten and re-aggregate top countries/cities over the returned window.
  const countryTotals: Record<string, number> = {};
  const cityTotals: Record<string, number> = {};

  for (const row of data ?? []) {
    for (const entry of (row.top_countries as { country: string; count: number }[] | null) ?? []) {
      countryTotals[entry.country] = (countryTotals[entry.country] ?? 0) + entry.count;
    }
    for (const entry of (row.top_cities as { city: string; count: number }[] | null) ?? []) {
      cityTotals[entry.city] = (cityTotals[entry.city] ?? 0) + entry.count;
    }
  }

  const topCountries = Object.entries(countryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  const topCities = Object.entries(cityTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  return NextResponse.json({
    topCountries,
    topCities,
  });
}

