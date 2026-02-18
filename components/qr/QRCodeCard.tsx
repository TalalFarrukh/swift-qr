'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QRCodeSummary } from '@/types/qrcode';
import { useToast } from '@/components/ui/toast';

interface QRCodeCardProps {
  qrCode: QRCodeSummary;
}

export function QRCodeCard({ qrCode }: QRCodeCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openConfirm = () => {
    if (isDeleting) return;
    setErrorMessage(null);
    setIsConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (isDeleting) return;
    setIsConfirmOpen(false);
    setErrorMessage(null);
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      setErrorMessage(null);
      const response = await fetch(`/api/qr-codes/${qrCode.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let message = 'Failed to delete QR code.';
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) {
            message = data.error;
          }
        } catch {
          // ignore JSON parse errors
        }
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      setIsConfirmOpen(false);
      showToast('QR code deleted successfully', 'success');
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const campaignType = qrCode.campaign_type as 'one-shot' | 'fidelity' | 'membership' | null | undefined;
  const scanLimit = (qrCode.scan_limit as number | null) ?? null;

  const renderCampaignBadge = () => {
    if (!campaignType) return null;

    let label = '';
    if (campaignType === 'one-shot') {
      label = 'One-shot';
    } else if (campaignType === 'fidelity') {
      label = scanLimit ? `Fidelity · ${qrCode.scan_count}/${scanLimit}` : 'Fidelity';
    } else if (campaignType === 'membership') {
      label = 'Membership';
    }

    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        {label}
      </span>
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/qr/${qrCode.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {qrCode.name}
          </Link>
          <p className="truncate text-sm text-muted-foreground">
            {qrCode.destination_url ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {qrCode.scan_count} scans
            {qrCode.last_scanned_at
              ? ` · Last scan ${new Date(qrCode.last_scanned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : ''}
          </p>
          {renderCampaignBadge()}
        </div>
        <div className="shrink-0">
          <img
            src={qrCode.qr_image_url}
            alt=""
            className="h-20 w-20 rounded border bg-white"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/qr/${qrCode.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View
        </Link>
        <Link
          href={`/qr/${qrCode.id}/edit`}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={openConfirm}
          disabled={isDeleting}
          className="text-sm font-medium text-destructive hover:underline disabled:opacity-60"
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Delete this QR code?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete this QR code and its analytics. This action cannot be undone.
            </p>
            {errorMessage && (
              <p className="mt-3 text-sm text-destructive">
                {errorMessage}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={isDeleting}
                className="rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
