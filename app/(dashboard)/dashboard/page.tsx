import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { QRCodeList } from '@/components/qr/QRCodeList';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

export default async function DashboardHomePage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const [{ data: qrCodes }, { count: totalQrCount }, { data: allForScans }] = await Promise.all([
    supabase
      .from('qr_codes')
      .select('id, name, short_code, type, destination_url, qr_image_url, scan_count, is_active, created_at, last_scanned_at')
      .eq('user_id', user.id)
      .eq('is_dynamic', true)
      .order('last_scanned_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_dynamic', true),
    supabase
      .from('qr_codes')
      .select('scan_count')
      .eq('user_id', user.id)
      .eq('is_dynamic', true),
  ]);
  const totalScans = (allForScans ?? []).reduce(
    (sum: number, q: { scan_count: number | null }) => sum + (q.scan_count ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">Overview</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total QR codes</p>
          <p className="mt-1 text-2xl font-semibold">{totalQrCount ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total scans</p>
          <p className="mt-1 text-2xl font-semibold">{totalScans}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Recent QR codes</h3>
        <Link
          href="/qr"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <QRCodeList qrCodes={qrCodes ?? []} />
    </div>
  );
}
