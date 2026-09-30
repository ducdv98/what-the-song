'use client';

import { useEffect, useRef } from 'react';
import type { PlaybackProgress } from '@/lib/audio/engine';
import { formatSeconds } from './PlayButton';
import { useI18n } from './I18nProvider';

/**
 * The round's clip lengths drawn to scale on one bar, 0 to the longest stage.
 *
 * To scale on purpose: 0.1s is a sliver and 16s is most of the bar, which is
 * exactly the point of the game — you can see how little you heard. Unlocked
 * audio is filled; while a clip plays, a lighter fill sweeps across it in real
 * time, driven from the audio clock (engine.progress), not a timer.
 */
export function Timeline({
  stages,
  stageIndex,
  playing,
  progress,
}: {
  stages: readonly number[];
  stageIndex: number;
  playing: boolean;
  progress: () => PlaybackProgress | null;
}) {
  const { t } = useI18n();
  const max = stages[stages.length - 1];
  const unlocked = stages[stageIndex];
  const pct = (s: number) => `${Math.min((s / max) * 100, 100)}%`;
  const sweep = useRef<HTMLDivElement>(null);

  // One rAF loop while playing, writing straight to the element's style —
  // a state update per frame would re-render the whole round for nothing.
  useEffect(() => {
    const el = sweep.current;
    if (!el) return;
    if (!playing) {
      el.style.width = '0%';
      return;
    }
    const longest = stages[stages.length - 1];
    let frame = 0;
    const tick = () => {
      const p = progress();
      el.style.width = p ? `${Math.min((p.elapsed / longest) * 100, 100)}%` : '0%';
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, progress, stages]);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div
        role="img"
        aria-label={t('round.timeline', { at: formatSeconds(unlocked), max: formatSeconds(max) })}
        style={{
          position: 'relative',
          height: 22,
          borderRadius: 'var(--r-comfortable)',
          background: 'var(--surface-card)',
          overflow: 'hidden',
        }}
      >
        {/* Unlocked audio. A floor of a few pixels keeps 0.1s visible. */}
        <div
          data-testid="timeline-unlocked"
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: `max(4px, ${pct(unlocked)})`,
            background: 'var(--accent)',
            transition: 'width 320ms ease',
          }}
        />
        {/* Live playhead. */}
        <div
          ref={sweep}
          data-testid="timeline-playhead"
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: '0%',
            background: 'rgba(255, 255, 255, 0.45)',
          }}
        />
        {/* Stage boundaries. */}
        {stages.slice(0, -1).map((s) => (
          <div
            key={s}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: pct(s),
              width: 1,
              background: 'rgba(0, 0, 0, 0.55)',
            }}
          />
        ))}
      </div>
      {/* Marker under the end of what is unlocked. */}
      <div style={{ position: 'relative', height: 16 }}>
        <span
          style={{
            position: 'absolute',
            left: pct(unlocked),
            // Centred under the fill's end, but kept inside the bar near
            // either edge — 0.1s sits 0.6% along, where centring would clip.
            transform: `translateX(${unlocked / max < 0.08 ? '0' : unlocked / max > 0.92 ? '-100%' : '-50%'})`,
            font: 'var(--t-small-bold)',
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
            transition: 'left 320ms ease',
          }}
        >
          ▲ {formatSeconds(unlocked)}
        </span>
      </div>
    </div>
  );
}
