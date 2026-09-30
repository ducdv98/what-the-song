import type { Metadata } from 'next';
import { FaqContent } from './FaqContent';

export const metadata: Metadata = {
  title: 'FAQ · what the song',
  description: 'How to play, scoring, accounts, and permitted use of what the song.',
};

export default function FaqPage() {
  return <FaqContent />;
}
