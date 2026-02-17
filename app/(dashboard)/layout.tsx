import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between border-b pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Swift QR Dashboard</h1>
          <DashboardNav />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

