import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyQrPassword } from '@/lib/auth/qr-password';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  const { shortCode, password } = (body as { shortCode?: string; password?: string }) ?? {};
  if (!shortCode || !password) {
    return NextResponse.json(
      { error: 'Missing shortCode or password', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select('id, password_hash, is_password_protected')
    .eq('short_code', shortCode)
    .eq('is_dynamic', true)
    .maybeSingle();

  if (error || !qrCode || !qrCode.is_password_protected) {
    return NextResponse.json(
      { error: 'QR code not found or not protected', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  const ok = verifyQrPassword(password, qrCode.password_hash as string | null);

  if (!ok) {
    return NextResponse.json(
      { error: 'Incorrect password', code: 'INVALID_PASSWORD' },
      { status: 401 },
    );
  }

  // Mark this short code as authorized in a cookie for this browser.
  const cookieName = `qr_auth_${shortCode}`;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
  });

  return response;
}

