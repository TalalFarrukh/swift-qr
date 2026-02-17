import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createDynamicQRSchema } from '@/lib/utils/validation';
import { generateUniqueShortCode } from '@/lib/qr/shortCode';
import { generateDynamicQrPng } from '@/lib/qr/generator';
import { uploadQrImageToStorage } from '@/lib/qr/upload';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('qr_codes')
    .select('id, name, short_code, type, destination_url, qr_image_url, scan_count, is_active, created_at, last_scanned_at')
    .eq('user_id', user.id)
    .eq('is_dynamic', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('qr-codes list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR codes', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }

  const { count } = await supabase
    .from('qr_codes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_dynamic', true);

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from('qr_codes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_dynamic', true);
  const limit = 10; // MVP: allow up to 10; later read from users.qr_code_limit
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: 'QR code limit reached', code: 'LIMIT_EXCEEDED' },
      { status: 403 },
    );
  }

  let payload: z.infer<typeof createDynamicQRSchema>;
  try {
    const json = await request.json();
    payload = createDynamicQRSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Invalid request', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_REDIRECT_DOMAIN ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectBase = baseUrl.replace(/\/$/, '');
  const shortCode = await generateUniqueShortCode();
  const redirectUrl = redirectBase.endsWith('/r') ? `${redirectBase}/${shortCode}` : `${redirectBase}/r/${shortCode}`;

  const fgColor = payload.customization?.fgColor ?? '#000000';
  const bgColor = payload.customization?.bgColor ?? '#ffffff';
  const logoUrl = payload.customization?.logoUrl;
  const style = payload.customization?.style;

  const pngBuffer = await generateDynamicQrPng(redirectUrl, { fgColor, bgColor, logoUrl, style });
  const qrImageUrl = await uploadQrImageToStorage(supabase, pngBuffer, user.id, shortCode);

  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .insert({
      user_id: user.id,
      name: payload.name,
      short_code: shortCode,
      type: payload.type,
      is_dynamic: true,
      destination_url: payload.destinationUrl,
      qr_image_url: qrImageUrl,
      // Store only non-logo appearance data; logo is baked into the QR image
      customization: {
        fgColor,
        bgColor,
        style,
      },
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('qr-codes create error:', error);
    return NextResponse.json(
      { error: 'Failed to create QR code', code: 'CREATE_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json(qrCode, { status: 201 });
}
