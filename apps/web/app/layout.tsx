import type { Metadata, Viewport } from 'next';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Agrinova Dashboard',
    template: '%s | Agrinova',
  },
  description: 'Sistem digital panen & gate check kebun sawit dengan dukungan offline-first',
  keywords: [
    'agrinova',
    'palm oil',
    'harvest',
    'gate check',
    'dashboard',
    'kelapa sawit',
    'panen',
  ],
  authors: [
    {
      name: 'Agrinova Team',
    },
  ],
  creator: 'Agrinova',
  publisher: 'Agrinova',
  metadataBase: new URL('https://agrinova.com'),
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://agrinova.com',
    title: 'Agrinova Dashboard',
    description: 'Sistem digital panen & gate check kebun sawit',
    siteName: 'Agrinova',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Agrinova Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agrinova Dashboard',
    description: 'Sistem digital panen & gate check kebun sawit',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
