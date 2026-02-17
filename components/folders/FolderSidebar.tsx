'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

export function FolderSidebar() {
  const { showToast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFolderId = searchParams.get('folderId');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch('/api/folders', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setFolders((data?.data as Folder[]) ?? []);
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) return;
        setErrorMessage('Failed to load folders.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navigateWithFolder = (folderId: string | null) => {
    const url = new URL(window.location.href);
    if (folderId) {
      url.searchParams.set('folderId', folderId);
    } else {
      url.searchParams.delete('folderId');
    }
    router.push(url.pathname + url.search);
  };

  const handleCreateFolder: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!newFolderName.trim()) return;

    setErrorMessage(null);
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error ?? 'Failed to create folder.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }
      setFolders((prev) => [...prev, data as Folder]);
      setNewFolderName('');
      showToast('Folder created successfully!', 'success');
    } catch (error) {
      console.error(error);
      const message = 'Failed to create folder.';
      setErrorMessage(message);
      showToast(message, 'error');
    }
  };

  const atQrList = pathname === '/qr';

  return (
    <aside className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Folders</p>
        <div className="mt-2 space-y-1 text-sm">
          <button
            type="button"
            onClick={() => navigateWithFolder(null)}
            className={`block w-full rounded-md px-2 py-1 text-left hover:bg-muted ${
              !activeFolderId ? 'bg-muted font-medium' : ''
            }`}
          >
            All QR codes
          </button>
          {isLoading ? (
            <div className="space-y-1">
              <div className="h-6 animate-pulse rounded bg-muted" />
              <div className="h-6 animate-pulse rounded bg-muted" />
            </div>
          ) : folders.length === 0 ? (
            <p className="rounded-md border border-dashed border-muted bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
              No folders yet. Create one below.
            </p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => navigateWithFolder(folder.id)}
                className={`block w-full truncate rounded-md px-2 py-1 text-left hover:bg-muted ${
                  activeFolderId === folder.id ? 'bg-muted font-medium' : ''
                }`}
              >
                {folder.name}
              </button>
            ))
          )}
        </div>
      </div>

      {atQrList && (
        <form className="space-y-2" onSubmit={handleCreateFolder}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="w-full rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            Add folder
          </button>
          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
        </form>
      )}

      {!atQrList && (
        <Link
          href="/qr"
          className="text-xs font-medium text-primary hover:underline"
        >
          Manage folders on the QR list
        </Link>
      )}
    </aside>
  );
}

