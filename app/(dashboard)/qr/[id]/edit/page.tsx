import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DynamicQRForm } from '@/components/qr/DynamicQRForm';
import type { QRCustomization } from '@/types/qrcode';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

interface QREditPageProps {
  params: Promise<{ id: string }>;
}

export default async function QREditPage(props: QREditPageProps) {
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

  const customization = (qrCode.customization as QRCustomization | null) ?? {};
  const defaultValues = {
    name: qrCode.name,
    type: (qrCode.type as 'url' | 'text') ?? 'url',
    destinationUrl: qrCode.destination_url ?? '',
    customization: {
      fgColor: customization.fgColor ?? '#000000',
      bgColor: customization.bgColor ?? '#ffffff',
      logoUrl: customization.logoUrl,
      style: customization.style ?? 'classic',
    },
    folderId: qrCode.folder_id ?? null,
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Edit QR code</h2>
      <p className="text-sm text-muted-foreground">
        Update the name, destination URL, and settings behind this QR code. The QR image itself stays the same; only the
        destination and behavior update behind the same short link.
      </p>
      <DynamicQRForm
        mode="edit"
        qrCodeId={qrCode.id}
        defaultValues={defaultValues}
      />
    </div>
  );
}
