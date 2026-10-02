'use client';

import { useState } from 'react';
import { useI18n } from './I18nProvider';

export type RoundAction = 'skip' | 'guess' | 'giveup';

/**
 * Free-text answer box plus the one action button beside it.
 *
 * There is no suggestion list (docs/adr/0001-free-text-guesses.md): the player
 * types the title from memory. With text in the box the button is Guess;
 * empty, it is Skip, or Give up on the last stage. Enter does whatever the
 * button does. A wrong guess is echoed back so a typo is easy to spot.
 */
export function GuessBar({
  lastStage,
  lastWrong,
  onGuess,
  onSkip,
  onGiveUp,
  topic = 'songs',
}: {
  topic?: 'songs' | 'food' | 'people';
  lastStage: boolean;
  /** The text of the previous wrong guess on this round, if any. */
  lastWrong?: string;
  onGuess: (text: string) => void;
  onSkip: () => void;
  onGiveUp: () => void;
}) {
  const { t } = useI18n();
  const guessLabel = topic === 'food' ? t('food.guessLabel') : topic === 'people' ? t('people.guessLabel') : t('round.guessLabel');
  const placeholder = topic === 'food' ? t('food.guessPlaceholder') : topic === 'people' ? t('people.guessPlaceholder') : t('round.guessPlaceholder');
  const answerHint = topic === 'food' ? t('food.answerHint') : topic === 'people' ? t('people.answerHint') : t('round.answerHint');
  const [text, setText] = useState('');

  const action: RoundAction = text.trim() ? 'guess' : lastStage ? 'giveup' : 'skip';

  function act() {
    if (action === 'guess') onGuess(text);
    else if (action === 'giveup') onGiveUp();
    else onSkip();
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
                act();
              }
            }}
            aria-describedby="guess-help"
          />
        </label>

        <button
          type="button"
          className={`action-btn${action === 'guess' ? ' action-btn--guess' : action === 'giveup' ? ' action-btn--giveup' : ''}`}
          onClick={act}
          data-action={action}
        >
          {action !== 'guess' && (
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5v14l10-7z M17 5h2v14h-2z" fill="currentColor" />
            </svg>
          )}
          {action === 'guess'
            ? t('round.guess')
            : action === 'giveup'
              ? t('round.giveUp')
              : t('round.skip')}
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
