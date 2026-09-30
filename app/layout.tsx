import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from './components/I18nProvider';

export const metadata: Metadata = {
  title: 'what the song',
  description: 'A guess-the-song game for Vietnamese music.',
  // Private game: keep it out of search indexes (docs/RESEARCH.md §10.1).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang is corrected client-side by I18nProvider once detection has run.
  return (
    <html lang="vi">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
