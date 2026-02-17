import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

interface QRDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QRDetailPage(props: QRDetailPageProps) {
  const params = await props.params;
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();

  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .eq('is_dynamic', true)
    .single();

  if (error || !qrCode) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{qrCode.name}</h2>
        <Link
          href={`/qr/${qrCode.id}/edit`}
          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Edit
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">QR code</p>
          <img
            src={qrCode.qr_image_url}
            alt=""
            className="inline-block h-48 w-48 rounded border bg-white"
          />
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Redirect URL</p>
            <p className="break-all text-sm">{qrCode.destination_url ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Short link</p>
            <p className="break-all text-sm">
              {process.env.NEXT_PUBLIC_APP_URL ?? ''}/r/{qrCode.short_code}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Scans</p>
            <p className="text-sm">{qrCode.scan_count}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Last scanned</p>
            <p className="text-sm">
              {qrCode.last_scanned_at
                ? new Date(qrCode.last_scanned_at).toLocaleString()
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <p className="text-sm">{qrCode.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Analytics</p>
            <Link
              href={`/qr/${qrCode.id}/analytics`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
