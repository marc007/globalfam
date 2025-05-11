import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppHeader } from '@/components/layout/AppHeader';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'GlobalFam - Connect with Friends',
  description: 'Keep track of your friends around the world with GlobalFam.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Apply dark theme by default */}
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col bg-background">
            <AppHeader />
            <main className="flex-1 container py-8">{children}</main>
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
