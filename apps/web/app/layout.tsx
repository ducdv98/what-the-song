import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from './components/I18nProvider';
import { AuthProvider } from './components/AuthProvider';
import { PwaRegistration } from './components/PwaRegistration';

// Static export needs the public origin at build time for absolute social image URLs.
const siteUrl = process.env.SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: 'Đoán bài hát Việt qua đoạn nhạc ngắn | what the song',
    template: '%s | what the song',
  },
  description: 'Nghe đoạn nhạc và đoán tên bài hát Việt. Đoán càng sớm, điểm càng cao.',
  applicationName: 'what the song',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'what the song', statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    siteName: 'what the song',
    title: 'what the song · Đoán bài hát Việt',
    description: 'Nghe đoạn nhạc và đoán tên bài hát Việt. Đoán càng sớm, điểm càng cao.',
    locale: 'vi_VN',
    images: siteUrl
      ? [{ url: '/social-preview.png', width: 1200, height: 630, alt: 'what the song · Đoán bài hát Việt' }]
      : undefined,
  },
  twitter: {
    card: siteUrl ? 'summary_large_image' : 'summary',
    title: 'what the song · Đoán bài hát Việt',
    description: 'Nghe đoạn nhạc và đoán tên bài hát Việt. Đoán càng sớm, điểm càng cao.',
    images: siteUrl ? ['/social-preview.png'] : undefined,
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
