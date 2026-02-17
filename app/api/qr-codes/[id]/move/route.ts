import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

  const { folderId } = (body as { folderId?: string | null }) ?? {};

  const supabase = await createServerSupabaseClient();

  // If folderId is provided, validate ownership.
  if (folderId) {
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found', code: 'FOLDER_NOT_FOUND' },
        { status: 404 },
      );
    }
  }

  const { data, error } = await supabase
    .from('qr_codes')
    .update({
      folder_id: folderId ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    console.error('qr-codes move error:', error);
    return NextResponse.json(
      { error: 'Failed to move QR code', code: 'MOVE_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

