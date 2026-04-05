// @refresh reset
import "@/lib/startup/preload";
import '@/globals.css';
import Providers from '@/components/Providers';
import { auth } from '@/lib/auth';
import { ReactNode } from 'react';

export const metadata = {
  title: {
    default: 'Paper Market Pro - Paper Trading Platform',
    template: '%s | Paper Market Pro'
  },
  description: 'Master stock trading with our advanced paper trading platform. Practice NSE trading with virtual money, real-time data, and comprehensive analytics.',
  keywords: ['NSE', 'paper trading', 'stock trading', 'virtual trading', 'trading platform', 'learn trading'],
  authors: [{ name: 'Paper Market Pro Team' }],
  creator: 'Paper Market Pro',
  publisher: 'Paper Market Pro',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://paper-market-pro.com',
    title: 'Paper Market Pro - Paper Trading Platform',
    description: 'Master stock trading with our advanced paper trading platform.',
    siteName: 'Paper Market Pro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paper Market Pro - Paper Trading Platform',
    description: 'Master stock trading with our advanced paper trading platform.',
    creator: '@papermarketpro',
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/icon.png', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// 🔥 REMOVED: MarketStreamProvider was here but ALSO in dashboard layout
// This caused duplicate SSE connections. Keep only in dashboard layout.

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
