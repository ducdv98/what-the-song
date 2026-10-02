import type { Metadata } from 'next';
import { FaqContent } from './FaqContent';
import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp',
  description: `Cách chơi, tính điểm, tài khoản và cách sử dụng ${APP_NAME}.`,
  openGraph: {
    title: `Câu hỏi thường gặp · ${APP_NAME}`,
    description: `Cách chơi, tính điểm, tài khoản và cách sử dụng ${APP_NAME}.`,
  },
};

export default function FaqPage() {
  return <FaqContent />;
}
