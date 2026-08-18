import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import CookieConsentBanner from '@/components/CookieConsentBanner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#10b981',
};

export const metadata: Metadata = {
  title: {
    default: 'Prado Jobs | Streamlined Operations & Job Management',
    template: '%s | Prado Jobs',
  },
  description:
    'Prado Jobs helps field service businesses quote, schedule, and invoice jobs from the field — in seconds, not spreadsheets.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prado Jobs',
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head />
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {isProduction ? (
          <Script
            id="pwa-sw-register"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                }
              `,
            }}
          />
        ) : null}
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}