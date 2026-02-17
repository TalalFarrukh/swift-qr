import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { USER_FILES_BUCKET } from '@/lib/constants';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const supabase = createServiceRoleSupabaseClient();

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);

  const { data: files, error } = await supabase
    .from('files')
    .select('id, stored_filename, qr_code_id, created_at')
    .is('qr_code_id', null)
    .lte('created_at', cutoff.toISOString())
    .limit(500);

  if (error || !files || files.length === 0) {
    return NextResponse.json({ deleted: 0 }, { status: 200 });
  }

  const paths = files.map((f) => f.stored_filename as string);
  const ids = files.map((f) => f.id as string);

  await supabase.storage.from(USER_FILES_BUCKET).remove(paths);
  await supabase.from('files').delete().in('id', ids);

  return NextResponse.json({ deleted: ids.length }, { status: 200 });
}

