import type { Metadata } from 'next';
import { TermsContent } from './TermsContent';
import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: `Điều khoản sử dụng và thông tin về giấy phép âm nhạc của ${APP_NAME}.`,
  openGraph: {
    title: `Điều khoản sử dụng · ${APP_NAME}`,
    description: `Điều khoản sử dụng và thông tin về giấy phép âm nhạc của ${APP_NAME}.`,
  },
};

export default function TermsPage() {
  return <TermsContent />;
}
