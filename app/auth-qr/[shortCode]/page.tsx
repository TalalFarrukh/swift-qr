'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthQRPageProps {
  params: { shortCode: string };
}

export default function AuthQRPage({ params }: AuthQRPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shortCode = params.shortCode;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/qr-codes/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(data?.error ?? 'Incorrect password.');
        return;
      }

      const redirectUrl = searchParams.get('redirect') ?? `/r/${shortCode}`;
      router.push(redirectUrl);
    } catch (error) {
      console.error(error);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Enter password</h1>
          <p className="text-sm text-muted-foreground">
            This QR code is protected. Enter the password to continue.
          </p>
        </div>
        <form className="w-full space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1 text-left">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="off"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {errorMessage ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}

