'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';

interface FileUploaderProps {
  onUploadComplete: (url: string) => void;
  label?: string;
  description?: string;
}

export function FileUploader({ onUploadComplete, label = 'Upload file', description }: FileUploaderProps) {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file || isUploading) return;

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.error ?? 'Upload failed.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      if (!data?.publicUrl) {
        const message = 'Upload succeeded but no URL was returned.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      showToast('File uploaded successfully!', 'success');
      onUploadComplete(data.publicUrl as string);
    } catch (error) {
      console.error(error);
      const message = 'Upload failed. Please try again.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
      </label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,video/mp4"
        onChange={handleChange}
        disabled={isUploading}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted disabled:opacity-60"
      />
      {isUploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

