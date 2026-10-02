import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from './components/I18nProvider';
import { AuthProvider } from './components/AuthProvider';
import { PwaRegistration } from './components/PwaRegistration';
import { APP_NAME, APP_DESCRIPTION, socialPreview } from '@/lib/brand';

// Static export needs the public origin at build time for absolute social image URLs.
const preview = socialPreview(process.env.SITE_URL);

export const metadata: Metadata = {
  metadataBase: preview.origin,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    locale: 'vi_VN',
    images: preview.image
      ? [{ url: preview.image, width: 1200, height: 630, alt: `${APP_NAME} · Trò chơi đoán nhiều chủ đề` }]
      : undefined,
  },
  twitter: {
    card: preview.card,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: preview.image ? [preview.image] : undefined,
  },
  // Private game: keep it out of search indexes (docs/RESEARCH.md §10.1).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#f9e549',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang is corrected client-side by I18nProvider once detection has run.
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <I18nProvider>
          <PwaRegistration />
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
