'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function HomeRedirect({ destination }: { destination: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(destination);
  }, [destination, router]);

  return <p><Link href={destination}>Play what the song</Link></p>;
}
