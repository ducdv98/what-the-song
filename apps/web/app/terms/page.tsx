import type { Metadata } from 'next';
import { TermsContent } from './TermsContent';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng và thông tin về giấy phép âm nhạc của what the song.',
  openGraph: {
    title: 'Điều khoản sử dụng · what the song',
    description: 'Điều khoản sử dụng và thông tin về giấy phép âm nhạc của what the song.',
  },
};

export default function TermsPage() {
  return <TermsContent />;
}
