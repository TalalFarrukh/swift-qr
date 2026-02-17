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
    .select('id, name')
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
    .from('scans')
    .select(
      'scanned_at, country, city, device_type, os, browser, referrer, language, ip_address',
    )
    .eq('qr_code_id', qrCodeId)
    .order('scanned_at', { ascending: true });

  if (error) {
    console.error('analytics export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics', code: 'EXPORT_ERROR' },
      { status: 500 },
    );
  }

  const rows = [
    ['scanned_at', 'country', 'city', 'device_type', 'os', 'browser', 'referrer', 'language', 'ip_address'],
    ...(data ?? []).map((row) => [
      row.scanned_at,
      row.country ?? '',
      row.city ?? '',
      row.device_type ?? '',
      row.os ?? '',
      row.browser ?? '',
      row.referrer ?? '',
      row.language ?? '',
      row.ip_address ?? '',
    ]),
  ];

  const csv = rows
    .map((cols) =>
      cols
        .map((value) => {
          const v = String(value ?? '');
          if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return `"${v.replace(/"/g, '""')}"`;
          }
          return v;
        })
        .join(','),
    )
    .join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="qr-analytics-${qrCodeId}.csv"`,
    },
  });
}

