'use client';

import { useState } from 'react';
import { useI18n } from './I18nProvider';

/**
 * Free-text Guess with separate Reveal more and Give up actions.
 * Enter only submits a nonempty Guess. A wrong guess is echoed back.
 */
export function GuessBar({
  lastStage,
  lastWrong,
  revealCost,
  onGuess,
  onRevealMore,
  onGiveUp,
  topic = 'songs',
}: {
  topic?: 'songs' | 'food' | 'people';
  lastStage: boolean;
  /** The text of the previous wrong guess on this round, if any. */
  lastWrong?: string;
  revealCost?: string;
  onGuess: (text: string) => void;
  onRevealMore: () => void;
  onGiveUp: () => void;
}) {
  const { t } = useI18n();
  const guessLabel = topic === 'food' ? t('food.guessLabel') : topic === 'people' ? t('people.guessLabel') : t('round.guessLabel');
  const placeholder = topic === 'food' ? t('food.guessPlaceholder') : topic === 'people' ? t('people.guessPlaceholder') : t('round.guessPlaceholder');
  const answerHint = topic === 'food' ? t('food.answerHint') : topic === 'people' ? t('people.answerHint') : t('round.answerHint');
  const [text, setText] = useState('');

  function guess() {
    if (!text.trim()) return;
    onGuess(text);
    setText('');
  }

  return (
    <>
      <div className="guess-bar">
        <label className="guess-field">
          <span className="visually-hidden">{guessLabel}</span>
          <input
            id="guess"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                guess();
              }
            }}
            aria-describedby="guess-help"
          />
        </label>

        <button
          type="button"
          className="action-btn action-btn--guess"
          onClick={guess}
          disabled={!text.trim()}
        >
          {t('round.guess')}
        </button>
      </div>
      <div className="guess-secondary-actions">
        {!lastStage && (
          <button type="button" className="action-btn action-btn--reveal" onClick={onRevealMore}>
            <span>{t('round.revealMore')}</span>
            {revealCost && <span className="reveal-cost">{revealCost}</span>}
          </button>
        )}
        <button type="button" className="action-btn action-btn--giveup" onClick={onGiveUp}>
          {t('round.giveUp')}
        </button>
      </div>
      <p
        id="guess-help"
        className={lastWrong ? 'answer-hint' : 'visually-hidden'}
        role="status"
      >
        {lastWrong ? t('round.notIt', { guess: lastWrong }) : answerHint}
      </p>
    </>
  );
}
