import type { Metadata } from 'next';
import { TermsContent } from './TermsContent';

export const metadata: Metadata = {
  title: 'Terms & conditions · what the song',
  description: 'Music license status, Vietnamese copyright rules, and terms for personal use.',
};

export default function TermsPage() {
  return <TermsContent />;
}
