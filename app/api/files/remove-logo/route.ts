import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { USER_FILES_BUCKET } from '@/lib/constants';

interface RemoveLogoBody {
  logoUrl?: string;
}

function extractUserFilesPathFromUrl(url: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const normalizedBase = supabaseUrl.replace(/\/$/, '');
  const marker = `${normalizedBase}/storage/v1/object/public/${USER_FILES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  const after = url.slice(idx + marker.length);
  const pathPart = after.split(/[?#]/)[0];
  return pathPart || null;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: RemoveLogoBody;
  try {
    body = (await request.json()) as RemoveLogoBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 });
  }

  if (!body.logoUrl) {
    return NextResponse.json({ error: 'logoUrl is required', code: 'MISSING_LOGO_URL' }, { status: 400 });
  }

  const storedPath = extractUserFilesPathFromUrl(body.logoUrl);
  if (!storedPath) {
    // Not a user-files URL; nothing to do on the server.
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  const supabase = await createServerSupabaseClient();

  // Best-effort: delete the storage object and clear any matching file records.
  await supabase.storage.from(USER_FILES_BUCKET).remove([storedPath]);

  await supabase
    .from('files')
    .delete()
    .eq('user_id', user.id)
    .eq('stored_filename', storedPath);

  return NextResponse.json({ ok: true }, { status: 200 });
}

