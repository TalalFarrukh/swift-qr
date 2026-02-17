import './globals.css';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';

export const metadata = {
  title: 'Swift QR',
  description: 'QR code generator platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

