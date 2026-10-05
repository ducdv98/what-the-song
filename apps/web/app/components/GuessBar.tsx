'use client';

import { useState, type FormEvent } from 'react';
import { useI18n } from './I18nProvider';

/**
 * Free-text Guess with separate Reveal more and Give up actions.
 * Enter only submits a nonempty Guess (a real form, so IME and mobile keyboards submit too).
 * Give up is destructive: it asks for confirmation before it ends the Round.
 * A wrong guess is echoed back.
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
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false);

  function guess(event?: FormEvent) {
    event?.preventDefault();
    if (!text.trim()) return;
    setConfirmingGiveUp(false);
    onGuess(text);
    setText('');
  }

  return (
    <>
      <form className="guess-bar" onSubmit={guess}>
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
            enterKeyHint="go"
            aria-describedby="guess-help"
          />
        </label>

        <button
          type="submit"
          className="action-btn action-btn--guess"
          disabled={!text.trim()}
        >
          {t('round.guess')}
        </button>
      </form>
      {!lastStage && (
        <div className="guess-secondary-actions">
          <button type="button" className="action-btn action-btn--reveal" onClick={onRevealMore}>
            <span>{t('round.revealMore')}</span>
            {revealCost && <span className="reveal-cost">{revealCost}</span>}
          </button>
        </div>
      )}
      {confirmingGiveUp ? (
        <div className="giveup-confirm" role="alertdialog" aria-labelledby="giveup-warning">
          <p id="giveup-warning" className="giveup-warning">{t('round.giveUpWarning')}</p>
          <div className="giveup-confirm-actions">
            <button type="button" className="action-btn action-btn--keep" autoFocus onClick={() => setConfirmingGiveUp(false)}>
              {t('round.giveUpCancel')}
            </button>
            <button type="button" className="action-btn action-btn--danger" onClick={onGiveUp}>
              {t('round.giveUpConfirm')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="giveup-link" onClick={() => setConfirmingGiveUp(true)}>
          {t('round.giveUp')}
        </button>
      )}
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
