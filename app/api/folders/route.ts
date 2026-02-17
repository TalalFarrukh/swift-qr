import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('folders')
    .select('id, name, parent_folder_id')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    console.error('folders list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  const { name, parentFolderId } = (body as { name?: string; parentFolderId?: string }) ?? {};
  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Folder name is required', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('folders')
    .insert({
      user_id: user.id,
      name: name.trim(),
      parent_folder_id: parentFolderId ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('folders create error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder', code: 'CREATE_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}

