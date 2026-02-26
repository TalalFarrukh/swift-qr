'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateDynamicQRInput } from '@/lib/utils/validation';
import { createDynamicQRSchema } from '@/lib/utils/validation';
import { FileUploader } from '@/components/files/FileUploader';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { useToast } from '@/components/ui/toast';

interface Folder {
  id: string;
  name: string;
}

interface DynamicQRFormProps {
  defaultValues?: Partial<CreateDynamicQRInput>;
  qrCodeId?: string;
  mode: 'create' | 'edit';
}

export function DynamicQRForm({
  defaultValues,
  qrCodeId,
  mode,
}: DynamicQRFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  useEffect(() => {
    if (mode === 'edit') {
      setIsLoadingFolders(true);
      fetch('/api/folders')
        .then((res) => res.json())
        .then((data) => {
          setFolders((data?.data as Folder[]) ?? []);
        })
        .catch((error) => {
          console.error('Failed to load folders:', error);
        })
        .finally(() => {
          setIsLoadingFolders(false);
        });
    }
  }, [mode]);

  const form = useForm<CreateDynamicQRInput>({
    resolver: zodResolver(createDynamicQRSchema) as any,
    defaultValues: defaultValues ?? {
      name: '',
      type: 'url',
      destinationUrl: '',
      customization: { fgColor: '#000000', bgColor: '#ffffff', style: 'classic' },
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (mode === 'edit' && defaultValues && 'folderId' in defaultValues) {
      setValue('folderId' as any, (defaultValues as any).folderId ?? null);
    }
  }, [mode, defaultValues, setValue]);

  const campaignType = watch('campaignType');

  const onSubmit = async (values: CreateDynamicQRInput) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const url = mode === 'edit' && qrCodeId ? `/api/qr-codes/${qrCodeId}` : '/api/qr-codes';
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const normalized: any = { ...values };

      if (normalized.customization) {
        if (normalized.customization.logoUrl === '') {
          // Normalize empty string to undefined so it passes Zod optional URL
          // and we don't persist meaningless empty values.
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete normalized.customization.logoUrl;
        }
      }

      // Normalize campaign fields
      if (!normalized.campaignType) {
        delete normalized.campaignType;
      }
      if (normalized.campaignType !== 'fidelity') {
        delete normalized.scanLimit;
      }
      if (normalized.campaignType !== 'membership') {
        delete normalized.validFrom;
        delete normalized.validUntil;
      }
      if (normalized.validFrom === '') {
        delete normalized.validFrom;
      }
      if (normalized.validUntil === '') {
        delete normalized.validUntil;
      }

      const body =
        mode === 'edit'
          ? {
              name: normalized.name,
              destinationUrl: normalized.destinationUrl,
              // These fields are only used on edit; they are allowed by the update schema.
              // We rely on uncontrolled inputs registered below so they appear in the raw form values.
              isPasswordProtected: (values as any).isPasswordProtected,
              password: (values as any).password,
              folderId: (values as any).folderId || null,
              campaignType: normalized.campaignType,
              scanLimit: normalized.scanLimit,
              validFrom: normalized.validFrom,
              validUntil: normalized.validUntil,
              customization: normalized.customization,
            }
          : normalized;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(data?.error ?? (mode === 'edit' ? 'Update failed' : 'Create failed'));
        return;
      }

      if (mode === 'create') {
        const created = await response.json();
        showToast('QR code created successfully!', 'success');
        router.push(`/qr/${created.id}`);
      } else {
        showToast('QR code updated successfully!', 'success');
        router.push(`/qr/${qrCodeId}`);
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      const message = 'Something went wrong. Please try again.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLogoUrl = watch('customization.logoUrl');

  const handleRemoveLogo = async () => {
    if (mode !== 'create') {
      // In edit mode, appearance is immutable; ignore remove requests.
      return;
    }

    if (!currentLogoUrl) {
      setValue('customization.logoUrl', '', { shouldDirty: true });
      return;
    }

    try {
      await fetch('/api/files/remove-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: currentLogoUrl }),
      });
    } catch {
      // Ignore errors; client-side removal is enough for UX, server cron can clean up later if needed.
    }

    setValue('customization.logoUrl', '', { shouldDirty: true });
  };

  return (
    <form className="max-w-xl space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          type="text"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="My QR code"
          {...register('name')}
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border bg-card/40 p-3">
        <p className="text-sm font-medium">Campaign (optional)</p>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="campaignType">
            Campaign type
          </label>
          <select
            id="campaignType"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            {...register('campaignType' as any)}
          >
            <option value="">None</option>
            <option value="one-shot">One-shot (single use)</option>
            <option value="fidelity">Fidelity (scan-limited)</option>
            <option value="membership">Membership (date-limited)</option>
          </select>
        </div>

        {campaignType === 'fidelity' && (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="scanLimit">
              Scan limit
            </label>
            <input
              id="scanLimit"
              type="number"
              min={1}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('scanLimit' as any, { valueAsNumber: true })}
            />
            {errors.scanLimit ? (
              <p className="text-xs text-destructive">{errors.scanLimit.message}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">Maximum number of scans before this QR stops working.</p>
          </div>
        )}

        {campaignType === 'membership' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <DatePickerField
                id="validFrom"
                label="Valid from"
                value={watch('validFrom' as any) ?? ''}
                onChange={(v) => setValue('validFrom' as any, v, { shouldDirty: true })}
                placeholder="Pick start date"
              />
              {errors.validFrom ? (
                <p className="text-xs text-destructive">{errors.validFrom.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <DatePickerField
                id="validUntil"
                label="Valid until"
                value={watch('validUntil' as any) ?? ''}
                onChange={(v) => setValue('validUntil' as any, v, { shouldDirty: true })}
                placeholder="Pick end date"
              />
              {errors.validUntil ? (
                <p className="text-xs text-destructive">{errors.validUntil.message}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="destinationUrl">
          Destination URL
        </label>
        <input
          id="destinationUrl"
          type="url"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="https://example.com"
          {...register('destinationUrl')}
        />
        {errors.destinationUrl ? (
          <p className="text-xs text-destructive">{errors.destinationUrl.message}</p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border bg-card/40 p-3">
        <p className="text-sm font-medium">Appearance</p>
        {mode === 'create' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="fgColor">
                  Foreground color
                </label>
                <input
                  id="fgColor"
                  type="color"
                  className="h-9 w-full cursor-pointer rounded-md border bg-background px-1 py-1"
                  {...register('customization.fgColor')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="bgColor">
                  Background color
                </label>
                <input
                  id="bgColor"
                  type="color"
                  className="h-9 w-full cursor-pointer rounded-md border bg-background px-1 py-1"
                  {...register('customization.bgColor')}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="logoUrl">
                Logo URL (optional)
              </label>
              <input
                id="logoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                {...register('customization.logoUrl')}
              />
            </div>
            <FileUploader
              label="Or upload a logo"
              description="PNG/JPEG/WebP recommended, up to 5MB."
              onUploadComplete={(url: string) => {
                setValue('customization.logoUrl', url, { shouldDirty: true });
              }}
            />
            {currentLogoUrl ? (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Remove logo
              </button>
            ) : null}
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="style">
                Style
              </label>
              <select
                id="style"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                {...register('customization.style')}
              >
                <option value="classic">Classic</option>
                <option value="rounded">Rounded</option>
                <option value="dots">Dots</option>
              </select>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Appearance (colors, logo, style) is set when you create the QR code and cannot be changed later. Edits here
            update only the destination and settings behind the same QR image.
          </p>
        )}
      </div>

      {mode === 'edit' && (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="folderId">
              Folder (optional)
            </label>
            <select
              id="folderId"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('folderId' as any)}
              disabled={isLoadingFolders}
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            {isLoadingFolders && (
              <p className="text-xs text-muted-foreground">Loading folders…</p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border bg-card/40 p-3">
            <p className="text-sm font-medium">Password protection</p>
          <div className="flex items-center gap-2">
            <input
              id="isPasswordProtected"
              type="checkbox"
              className="h-4 w-4 rounded border"
              {...register('isPasswordProtected' as any)}
            />
            <label className="text-sm" htmlFor="isPasswordProtected">
              Require a password to open this QR code
            </label>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              Set or change password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="off"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('password' as any)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current password. Uncheck the box to remove password protection.
            </p>
          </div>
        </div>
        </>
      )}

      {errorMessage ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? (mode === 'edit' ? 'Saving…' : 'Creating…') : mode === 'edit' ? 'Save' : 'Create QR code'}
      </button>
    </form>
  );
}
