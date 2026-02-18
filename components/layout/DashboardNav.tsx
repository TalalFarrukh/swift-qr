'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function DashboardNav() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mounted]);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <nav className="flex items-center gap-4">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        Overview
      </Link>
      <Link
        href="/qr"
        className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        QR codes
      </Link>
      <Link
        href="/qr/create"
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Create QR
      </Link>
      <button
        type="button"
        onClick={toggleDarkMode}
        className="rounded-md border border-input bg-background p-1.5 text-muted-foreground hover:bg-muted"
        aria-label="Toggle dark mode"
        suppressHydrationWarning
      >
        {!mounted ? (
          <span className="h-4 w-4" />
        ) : isDark ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        Logout
      </button>
    </nav>
  );
}
