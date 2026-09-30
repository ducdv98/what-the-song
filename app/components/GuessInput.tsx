'use client';

import { useMemo, useRef, useState } from 'react';
import { searchCatalogue, type IndexedSong } from '@/lib/catalogue';

/**
 * Autocomplete-constrained guessing (docs/RESEARCH.md §3.2).
 *
 * The player picks a real catalogue entry, so a win is an ID comparison rather
 * than a fuzzy string match. Search still runs on the diacritic-free key, so
 * typing "noi nay co anh" with no tone marks finds the right song.
 */
export function GuessInput({
  index,
  onGuess,
  disabled,
}: {
  index: IndexedSong[];
  onGuess: (title: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => (text.trim() ? searchCatalogue(text, index) : []),
    [text, index],
  );

  function commit(song: IndexedSong | undefined) {
    if (!song) return;
    onGuess(song.title);
    setText('');
    setOpen(false);
    setHighlight(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        // Enter takes the highlighted row — never the raw text, so a guess is
        // always a real catalogue entry.
        commit(suggestions[highlight]);
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }

  const listboxId = 'guess-suggestions';
  const showList = open && suggestions.length > 0 && !disabled;

  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor="guess" className="visually-hidden">
        Name the song
      </label>
      <input
        id="guess"
        ref={inputRef}
        className="search"
        type="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder="Tên bài hát… (dấu không bắt buộc)"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
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

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--s-2))',
            left: 0,
            right: 0,
            zIndex: 10,
            margin: 0,
            padding: 'var(--s-1)',
            listStyle: 'none',
            /* Dropdowns sit above cards (DESIGN.md §6, Level 2/3). */
            background: 'var(--surface-card)',
            borderRadius: 'var(--r-comfortable)',
            boxShadow: 'var(--shadow-heavy)',
            maxHeight: 320,
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
                e.preventDefault(); // keep focus so onBlur ordering stays sane
                commit(song);
              }}
              style={{
                padding: 'var(--s-3) var(--s-4)',
                borderRadius: 'var(--r-standard)',
                background: i === highlight ? 'var(--surface-card-alt)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ font: 'var(--t-caption-bold)', color: 'var(--text-base)' }}>
                {song.title}
              </div>
              <div style={{ font: 'var(--t-small)', color: 'var(--text-muted)' }}>
                {song.artist}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
