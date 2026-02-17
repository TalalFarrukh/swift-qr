import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Optionally, ensure the folder is empty before deleting.
  const { data: usedByQr } = await supabase
    .from('qr_codes')
    .select('id')
    .eq('folder_id', id)
    .limit(1);

  if (usedByQr && usedByQr.length > 0) {
    return NextResponse.json(
      { error: 'Folder is not empty', code: 'FOLDER_NOT_EMPTY' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('folders delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder', code: 'DELETE_ERROR' },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

