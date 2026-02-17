import { QRCodeCard } from './QRCodeCard';
import type { QRCode } from '@/types/qrcode';

interface QRCodeListProps {
  qrCodes: QRCode[];
}

export function QRCodeList({ qrCodes }: QRCodeListProps) {
  if (qrCodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        <h3 className="mt-4 text-sm font-semibold text-foreground">No QR codes yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by creating your first dynamic QR code.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {qrCodes.map((qr) => (
        <li key={qr.id}>
          <QRCodeCard qrCode={qr} />
        </li>
      ))}
    </ul>
  );
}
