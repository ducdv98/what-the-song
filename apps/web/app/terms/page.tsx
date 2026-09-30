import type { Metadata } from 'next';
import { TermsContent } from './TermsContent';

export const metadata: Metadata = {
  title: 'Terms & conditions · what the song',
  description: 'Personal, noncommercial use, app licensing, and third-party rights.',
};

export default function TermsPage() {
  return <TermsContent />;
}
