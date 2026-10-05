'use client';

import { useEffect, useState } from 'react';
import type { BigEffect, CelebrationPlan, Topic } from '@/lib/celebration';
import { useI18n } from './I18nProvider';

function useReducedMotion() {
  // Start static until the browser preference is known, including during hydration.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) { setReduced(false); return; }
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Effect({ effect, topic }: { effect: BigEffect; topic: Topic }) {
  const { t } = useI18n();
  if (effect === 'confetti' || effect === 'fireworks') return null;
  if (effect === 'emoji') {
    const emoji = topic === 'songs' ? '🎵' : topic === 'food' ? '🍜' : '⭐';
    return <span className="celebration-emoji" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i}>{emoji}</span>)}</span>;
  }
  return <span className={`celebration-decoration celebration-decoration--${effect}`} aria-hidden="true">
    {effect === 'cheerBubble' ? t('celebration.bubble') : effect === 'vinyl' ? '♫' : effect === 'gold' ? '✦' : t('celebration.shout')}
  </span>;
}

export function CelebrationEffect({ plan, topic }: { plan: CelebrationPlan; topic: Topic }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(35);
    const canvasEffects = [plan.primary, plan.secondary].filter((effect) => effect === 'confetti' || effect === 'fireworks');
    if (!canvasEffects.length) return;
    let active = true;
    let timers: ReturnType<typeof setTimeout>[] = [];
    void import('canvas-confetti').then(({ default: confetti }) => {
      if (!active) return;
      canvasEffects.forEach((effect) => {
        for (let i = 0; i < plan.bursts; i++) {
          timers.push(setTimeout(() => {
            if (!active || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
            void confetti({
              particleCount: effect === 'fireworks' ? 55 : 75,
              spread: effect === 'fireworks' ? 55 : 85,
              startVelocity: effect === 'fireworks' ? 48 : 30,
              origin: { x: effect === 'fireworks' ? (i % 2 ? .7 : .3) : .5, y: .42 },
              colors: ['#F46A48', '#F9E549', '#196B56', '#172533'],
              disableForReducedMotion: true,
            });
          }, i * 240));
        }
      });
    });
    return () => { active = false; timers.forEach(clearTimeout); timers = []; };
  }, [plan, reduced]);

  return <div className="celebration" data-primary={plan.primary} data-bursts={plan.bursts}>
    <p className="celebration-cheer">{t(`celebration.${plan.cheer}`)}</p>
    {plan.milestones.length > 0 && <p className="celebration-milestones">{plan.milestones.map((milestone) => t(`celebration.${milestone}`)).join(' · ')}</p>}
    {!reduced && <div className="celebration-visuals"><Effect effect={plan.primary} topic={topic} />{plan.secondary && <Effect effect={plan.secondary} topic={topic} />}</div>}
  </div>;
}
