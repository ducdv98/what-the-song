import type { Metadata } from 'next';
import { FaqContent } from './FaqContent';

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp',
  description: 'Cách chơi, tính điểm, tài khoản và cách sử dụng what the song.',
  openGraph: {
    title: 'Câu hỏi thường gặp · what the song',
    description: 'Cách chơi, tính điểm, tài khoản và cách sử dụng what the song.',
  },
};

export default function FaqPage() {
  return <FaqContent />;
}
