'use client';

import { useState } from 'react';
import type { Reveal } from '@wts/topic-people';

/** Keep the full photo mounted and expose only its top edge through the frame. */
export function RevealPhoto({ reveal, url }: { reveal: Reveal; url: string | null }) {
  const [ratio, setRatio] = useState(1);
  return (
    <div
      className="reveal-photo"
      data-testid="reveal-photo"
      data-fraction={reveal.fraction}
      style={{ aspectRatio: ratio / reveal.fraction }}
    >
      {url && <img
        src={url}
        alt=""
        data-testid="reveal-photo-image"
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight);
        }}
      />}
    </div>
  );
}
