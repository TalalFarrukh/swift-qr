import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { QRCodeList } from '@/components/qr/QRCodeList';
import { FolderSidebar } from '@/components/folders/FolderSidebar';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

interface QRListPageProps {
  searchParams: Promise<{ folderId?: string }>;
}

export default async function QRListPage(props: QRListPageProps) {
  const searchParams = await props.searchParams;
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('qr_codes')
    .select(
      'id, name, short_code, type, destination_url, qr_image_url, scan_count, is_active, created_at, last_scanned_at, folder_id',
    )
    .eq('user_id', user.id)
    .eq('is_dynamic', true)
    .order('created_at', { ascending: false });

  if (searchParams.folderId) {
    query = query.eq('folder_id', searchParams.folderId);
  }

  const { data: qrCodes } = await query;

  return (
    <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="md:border-r md:pr-4">
        <FolderSidebar />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Your QR codes</h2>
          <Link
            href="/qr/create"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create QR code
          </Link>
        </div>
        <QRCodeList qrCodes={qrCodes ?? []} />
      </div>
    </div>
  );
}
