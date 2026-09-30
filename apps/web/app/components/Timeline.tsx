'use client';

import { useEffect, useRef } from 'react';
import type { PlaybackProgress } from '@/lib/audio/engine';
import { formatSeconds } from './PlayButton';
import { useI18n } from './I18nProvider';

/** Readable setlist markers above a proportional, real audio progress track. */
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
  const sweep = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sweep.current;
    if (!el) return;
    if (!playing) {
      el.style.width = '0%';
      return;
    }
    let frame = 0;
    const tick = () => {
      const p = progress();
      el.style.width = p ? `${Math.min((p.elapsed / max) * 100, 100)}%` : '0%';
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, progress, max]);
  return (
    <div className="timeline">
      <div className="stage-strip" role="list" aria-label={t('round.stages')}>
        {stages.map((s, i) => (
          <div
            key={s}
            role="listitem"
            aria-current={i === stageIndex ? 'step' : undefined}
            className={`stage-marker${i === stageIndex ? ' stage-marker--current' : i < stageIndex ? ' stage-marker--unlocked' : ''}`}
          >
            <span>{formatSeconds(s)}</span>
            <small>{String(i + 1).padStart(2, '0')}</small>
          </div>
        ))}
      </div>
      <div
        className="audio-track"
        role="img"
        aria-label={t('round.timeline', {
          at: formatSeconds(unlocked),
          max: formatSeconds(max),
        })}
      >
        <div
          className="audio-unlocked"
          data-testid="timeline-unlocked"
          style={{
            width: `max(4px, ${Math.min((unlocked / max) * 100, 100)}%)`,
          }}
        />
        <div
          ref={sweep}
          className="audio-sweep"
          data-testid="timeline-playhead"
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
}
