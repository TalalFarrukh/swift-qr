import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/middleware';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { USER_FILES_BUCKET } from '@/lib/constants';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
];

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided', code: 'NO_FILE' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type', code: 'INVALID_FILE_TYPE', allowedTypes: ALLOWED_TYPES },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large', code: 'FILE_TOO_LARGE', maxSize: MAX_FILE_SIZE },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const storedFilename = `${user.id}/${Date.now()}-${file.name}`;

  const { data: storageResult, error: storageError } = await supabase.storage
    .from(USER_FILES_BUCKET)
    .upload(storedFilename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError || !storageResult) {
    console.error('upload storage error:', storageError);
    return NextResponse.json(
      { error: 'Upload failed', code: 'UPLOAD_ERROR' },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = supabase.storage.from(USER_FILES_BUCKET).getPublicUrl(storedFilename);
  const publicUrl = publicUrlData.publicUrl;

  const { data: fileRecord, error: dbError } = await supabase
    .from('files')
    .insert({
      user_id: user.id,
      qr_code_id: null,
      original_filename: file.name,
      stored_filename: storedFilename,
      file_path: storageResult.path,
      file_size: file.size,
      file_type: file.type,
      mime_type: file.type,
    })
    .select()
    .single();

  if (dbError || !fileRecord) {
    console.error('upload db error:', dbError);
    return NextResponse.json(
      { error: 'Upload failed', code: 'UPLOAD_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ...fileRecord,
      publicUrl,
    },
    { status: 201 },
  );
}

