import { tierOf } from './difficulty.ts';
import { pickSubject } from './pick-subject.ts';
import { createRound, type Round } from './round.ts';
import type { Subject } from './topic.ts';

export interface WarmUpProgress {
  rounds: number;
  won: boolean;
  /** False when the Topic already had normal Rounds before this visit. */
  warmUp: boolean;
}

export function warmUpEligible(savedTier: string | null, topicPlayed: number, progress: WarmUpProgress | null): boolean {
  if (savedTier !== null) return false;
  if (progress === null) return topicPlayed === 0;
  return progress.warmUp && !progress.won && progress.rounds < 3 && topicPlayed <= progress.rounds;
}

/** Decide medium eligibility from the whole Topic, then honour the Facet when it has eligible Subjects. */
export function warmUpSubjects<S extends Subject>(subjects: readonly S[], inFacet: readonly S[] = subjects): S[] {
  const easy = subjects.filter((subject) => tierOf(subject) === 'easy');
  const eligible = easy.length >= 10 ? easy : subjects.filter((subject) => {
    const tier = tierOf(subject);
    return tier === 'easy' || tier === 'medium';
  });
  const eligibleIds = new Set(eligible.map((subject) => subject.id));
  const filtered = inFacet.filter((subject) => eligibleIds.has(subject.id));
  return filtered.length > 0 ? filtered : eligible;
}

export function warmUpRound<S extends Subject, C>(
  subjects: readonly S[], played: Set<string>, ladder: (subject: S) => readonly C[],
): Round<S, C> | null {
  const subject = pickSubject(subjects, played);
  if (!subject) return null;
  const round = createRound(subject, ladder(subject));
  return { ...round, stageIndex: Math.floor(round.stages.length / 2) };
}

export function finishWarmUp(progress: WarmUpProgress, won: boolean): WarmUpProgress {
  return { ...progress, rounds: progress.rounds + 1, won: progress.won || won };
}
