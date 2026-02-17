import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { trackScan } from '@/lib/analytics/tracker';

interface RouteParams {
  params: Promise<{ shortCode: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { shortCode } = await params;

  const supabase = createServiceRoleSupabaseClient();
  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select('id, destination_url, is_active, valid_from, valid_until, is_password_protected')
    .eq('short_code', shortCode)
    .eq('is_dynamic', true)
    .maybeSingle();

  if (error) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (!qrCode) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (!qrCode.is_active) {
    return new NextResponse('QR code is no longer available', { status: 410 });
  }

  const now = new Date();
  if (qrCode.valid_until && new Date(qrCode.valid_until) < now) {
    return new NextResponse('QR code has expired', { status: 410 });
  }
  if (qrCode.valid_from && new Date(qrCode.valid_from) > now) {
    return new NextResponse('QR code is not yet valid', { status: 410 });
  }

  if (qrCode.is_password_protected) {
    const cookieStore = await cookies();
    const cookieName = `qr_auth_${shortCode}`;
    const authCookie = cookieStore.get(cookieName)?.value;
    if (!authCookie) {
      const url = new URL(`/auth-qr/${shortCode}`, request.url);
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url.toString());
    }
  }

  const destination = qrCode.destination_url?.trim();
  if (!destination || !destination.startsWith('http')) {
    return new NextResponse('Invalid destination', { status: 500 });
  }

  trackScan(shortCode, qrCode.id, request).catch(() => {});

  return NextResponse.redirect(destination, { status: 302 });
}
