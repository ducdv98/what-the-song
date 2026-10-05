/** Decoration decisions for a finished Round. No browser state or Score changes. */
export const BIG_EFFECTS = ['confetti', 'fireworks', 'emoji', 'cheerBubble', 'vinyl', 'gold', 'cheerText'] as const;
export type BigEffect = typeof BIG_EFFECTS[number];
export type Topic = 'songs' | 'food' | 'people';

export type ResultContext = {
  wasWarmUp: boolean;
  firstWarmUpWin: boolean;
  streak: number;
  previousStreak: number;
  bestStreak: number;
};

export type CelebrationInput = {
  topic: Topic;
  stageIndex: number;
  tier: string;
  streak: number;
  firstWarmUpWin: boolean;
};

export type CelebrationPlan = {
  primary: BigEffect;
  secondary: BigEffect | null;
  bursts: number;
  cheer: 'first' | 'middle' | 'last';
  milestones: ('firstStage' | 'hardTier' | 'streak' | 'warmUp')[];
};

export function selectCelebration(input: CelebrationInput, previous: BigEffect | null, random: number): CelebrationPlan {
  const pool = BIG_EFFECTS.filter((effect) => effect !== previous && (input.topic === 'songs' || effect !== 'vinyl'));
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random * pool.length)));
  const primary = pool[index]!;
  const milestones: CelebrationPlan['milestones'] = [];
  if (input.stageIndex === 0) milestones.push('firstStage');
  if (['hard', 'expert', 'impossible'].includes(input.tier)) milestones.push('hardTier');
  if ([3, 5, 10].includes(input.streak)) milestones.push('streak');
  if (input.firstWarmUpWin) milestones.push('warmUp');
  const secondary = milestones.length ? BIG_EFFECTS.find((effect) => effect !== primary && (input.topic === 'songs' || effect !== 'vinyl'))! : null;
  return {
    primary,
    secondary,
    bursts: input.firstWarmUpWin ? 3 : milestones.length ? 2 : 1,
    cheer: input.stageIndex === 0 ? 'first' : input.stageIndex < 3 ? 'middle' : 'last',
    milestones,
  };
}

export function lossProgress(stageIndex: number, stageCount: number): 'early' | 'middle' | 'late' {
  const progress = (stageIndex + 1) / Math.max(1, stageCount);
  return progress <= 1 / 3 ? 'early' : progress < 1 ? 'middle' : 'late';
}
