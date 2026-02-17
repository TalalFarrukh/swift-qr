import { DynamicQRForm } from '@/components/qr/DynamicQRForm';

export default function CreateQRPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Create dynamic QR code</h2>
      <p className="text-sm text-muted-foreground">
        Create a QR code that redirects to your URL. You can change the destination anytime.
      </p>
      <DynamicQRForm mode="create" />
    </div>
  );
}
