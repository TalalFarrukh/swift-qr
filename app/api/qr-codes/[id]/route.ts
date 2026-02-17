import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { updateDynamicQRSchema } from '@/lib/utils/validation';
import { hashQrPassword } from '@/lib/auth/qr-password';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = updateDynamicQRSchema.parse(body);
  } catch (error) {
    if (error instanceof Error && 'errors' in error) {
      // ZodError-like
      // @ts-expect-error - runtime check for zod error shape
      const zodErrors = error.errors as { path: (string | number)[]; message: string }[];
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: zodErrors.map((e) => ({
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

  const supabase = await createServerSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from('qr_codes')
    .select('id, short_code, destination_url, customization, is_password_protected, password_hash')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_dynamic', true)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: 'QR code not found', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.destinationUrl !== undefined) updates.destination_url = parsed.destinationUrl;
  if (parsed.isActive !== undefined) updates.is_active = parsed.isActive;

  if (parsed.isPasswordProtected !== undefined) {
    updates.is_password_protected = parsed.isPasswordProtected;
    if (!parsed.isPasswordProtected) {
      updates.password_hash = null;
    }
  }

  if (parsed.password) {
    updates.password_hash = hashQrPassword(parsed.password);
    updates.is_password_protected = true;
  }

  if (parsed.folderId !== undefined) {
    updates.folder_id = parsed.folderId;
  }

  const { data: updated, error: updateError } = await supabase
    .from('qr_codes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('qr-codes update error:', updateError);
    return NextResponse.json(
      { error: 'Failed to update QR code', code: 'UPDATE_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('qr_codes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('qr-codes delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete QR code', code: 'DELETE_ERROR' },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

