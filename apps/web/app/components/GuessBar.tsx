'use client';

import { useMemo, useState } from 'react';
import { searchCatalogue, type IndexedSong } from '@wts/game';
import { useI18n } from './I18nProvider';

export type RoundAction = 'skip' | 'guess' | 'giveup';

/**
 * Search box plus the one action button beside it.
 *
 * Guessing is autocomplete-constrained (docs/RESEARCH.md §3.2): picking a
 * suggestion fills the box with "Title — Artist" and turns the button into
 * Guess; typing again drops the pick. With nothing picked the button is Skip,
 * or Give up on the last stage. Enter picks the highlighted suggestion, and
 * with a pick in place Enter submits it.
 */
export function GuessBar({
  index,
  lastStage,
  onGuess,
  onSkip,
  onGiveUp,
}: {
  index: IndexedSong[];
  lastStage: boolean;
  onGuess: (song: IndexedSong) => void;
  onSkip: () => void;
  onGiveUp: () => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<IndexedSong | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(
    () => (text.trim() && !picked ? searchCatalogue(text, index) : []),
    [text, index, picked],
  );
  const showList = open && suggestions.length > 0;
  const action: RoundAction = picked ? 'guess' : lastStage ? 'giveup' : 'skip';

  function pick(song: IndexedSong | undefined) {
    if (!song) return;
    setPicked(song);
    setText(`${song.title} — ${song.artist}`);
    setOpen(false);
  }

  function reset() {
    setPicked(null);
    setText('');
    setHighlight(0);
  }

  function act() {
    if (action === 'guess' && picked) onGuess(picked);
    else if (action === 'giveup') onGiveUp();
    else onSkip();
    reset();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (picked) act();
      else if (showList) pick(suggestions[highlight]);
      return;
    }
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const listboxId = 'guess-suggestions';

  return (
    <div style={{ display: 'flex', gap: 'var(--s-2)', position: 'relative' }}>
      <label className="guess-field">
        <span className="visually-hidden">{t('round.guessLabel')}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none', color: 'var(--text-muted)' }}>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="guess"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('round.guessPlaceholder')}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPicked(null);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on a suggestion lands before the list unmounts.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `guess-opt-${highlight}` : undefined}
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
        {action === 'guess' ? t('round.guess') : action === 'giveup' ? t('round.giveUp') : t('round.skip')}
      </button>

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + var(--s-2))',
            left: 0,
            right: 0,
            zIndex: 10,
            margin: 0,
            padding: 'var(--s-1)',
            listStyle: 'none',
            background: 'var(--surface-card)',
            borderRadius: 'var(--r-comfortable)',
            boxShadow: 'var(--shadow-heavy)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((song, i) => (
            <li
              key={song.id}
              id={`guess-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the box
                pick(song);
              }}
              style={{
                padding: 'var(--s-2) var(--s-3)',
                borderRadius: 'var(--r-standard)',
                background: i === highlight ? 'var(--surface-card-alt)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ font: 'var(--t-caption-bold)', color: 'var(--text-base)' }}>{song.title}</div>
              <div style={{ font: 'var(--t-small)', color: 'var(--text-muted)' }}>{song.artist}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
