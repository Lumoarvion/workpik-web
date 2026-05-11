import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'Workpik - Photo Proof of Work',
  description: 'Field work verification platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <QueryProvider>
          {children}
          <Toaster position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
