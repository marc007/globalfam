
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppHeader } from '@/components/layout/AppHeader';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'GlobalVibe - Connect with Your Vibe',
  description: 'Share your world, see theirs. Stay connected with GlobalVibe.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col bg-background p-2.5">
            <AppHeader />
            <main className="flex-1 container mx-auto p-12">{children}</main>
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
