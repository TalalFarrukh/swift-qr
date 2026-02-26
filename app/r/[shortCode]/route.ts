import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { trackScan } from '@/lib/analytics/tracker';
import { getPlanForTier } from '@/lib/plans';
import { DEFAULT_SUBSCRIPTION_TIER } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ shortCode: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { shortCode } = await params;

  const supabase = createServiceRoleSupabaseClient();
  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select(
      'id, user_id, destination_url, is_active, valid_from, valid_until, is_password_protected, campaign_type, scan_limit, scan_count',
    )
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

  // Membership-style validity using valid_from/valid_until
  if (qrCode.valid_until && new Date(qrCode.valid_until) < now) {
    return new NextResponse('QR code has expired', { status: 410 });
  }
  if (qrCode.valid_from && new Date(qrCode.valid_from) > now) {
    // Not yet active
    return new NextResponse('QR code is not yet valid', { status: 403 });
  }

  // Plan-based monthly scan limit (free tier)
  if (qrCode.user_id) {
    const { data: userRow } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, qr_code_limit, campaign_limit')
      .eq('id', qrCode.user_id as string)
      .maybeSingle();

    const plan = getPlanForTier(userRow?.subscription_tier ?? DEFAULT_SUBSCRIPTION_TIER, {
      qrCodeLimit: userRow?.qr_code_limit ?? null,
      campaignLimit: userRow?.campaign_limit ?? null,
    });

    if (plan.definition.tier === 'free' && plan.limits.scansPerMonth != null) {
      const nowDate = new Date();
      const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

      const { count: monthlyCount } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('qr_code_id', qrCode.id)
        .gte('scanned_at', monthStart.toISOString());

      if ((monthlyCount ?? 0) >= plan.limits.scansPerMonth) {
        return new NextResponse('This link is not available right now.', { status: 403 });
      }
    }
  }

  // Campaign-specific rules (one-shot, fidelity)
  const campaignType = qrCode.campaign_type as 'one-shot' | 'fidelity' | 'membership' | null | undefined;
  const scanCount = (qrCode.scan_count as number | null) ?? 0;
  const scanLimit = (qrCode.scan_limit as number | null) ?? null;

  if (campaignType === 'one-shot' && scanCount >= 1) {
    return new NextResponse('This QR code has already been used', { status: 410 });
  }

  if (campaignType === 'fidelity' && scanLimit && scanCount >= scanLimit) {
    return new NextResponse('Scan limit for this QR code has been reached', { status: 410 });
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
