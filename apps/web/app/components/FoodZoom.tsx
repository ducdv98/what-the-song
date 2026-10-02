'use client';

import { useState } from 'react';
import type { Zoom } from '@wts/topic-food';

/** The same image element remains mounted while the Stage changes. */
export function FoodZoom({ zoom, url }: { zoom: Zoom; url: string | null }) {
  const [ratio, setRatio] = useState(1);
  const fraction = zoom.fraction;
  const focal = zoom.focalPoint ?? { x: 0.5, y: 0.5 };
  // Keep the requested crop inside the photo, including focal points near an edge.
  const x = Math.max(fraction / 2, Math.min(1 - fraction / 2, focal.x));
  const y = Math.max(fraction / 2, Math.min(1 - fraction / 2, focal.y));
  const scale = 1 / fraction;
  // cqw follows the displayed Stage width; dividing by scale keeps the visible blur steady.
  const blur = (2.5 * 100 / 380) * zoom.obscuring / scale;

  return (
    <div
      className="food-zoom"
      data-testid="food-zoom"
      data-fraction={fraction}
      style={{ aspectRatio: ratio, width: `min(100%, 380px, ${360 * ratio}px)` }}
    >
      {url && (
        <img
          src={url}
          alt=""
          data-testid="food-photo"
          style={{
            transform: `translate(${(0.5 - x) * scale * 100}%, ${(0.5 - y) * scale * 100}%) scale(${scale})`,
            filter: zoom.obscuring > 0
              ? `blur(${blur}cqw) grayscale(${0.9 * zoom.obscuring})`
              : undefined,
          }}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight);
          }}
        />
      )}
    </div>
  );
}
