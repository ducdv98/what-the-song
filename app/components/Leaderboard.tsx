'use client';

import { useEffect, useState } from 'react';
import { cleanName, nameKey, MAX_NAME_LENGTH, type Period } from '@/lib/game/leaderboard';
import { fetchBoard, type Board } from '@/lib/game/scoreboard';
import { useI18n } from './I18nProvider';

/** Rows shown before the list is cut; the player's own row is always shown. */
const TOP = 10;

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ok'; board: Board };

/**
 * This week's or month's board, and the name the player's results go under.
 *
 * Refetches when `version` changes, which Game bumps after a result is sent,
 * so a win shows up on the board without a reload.
 */
export function Leaderboard({
  name,
  onName,
  version,
  pending,
}: {
  name: string;
  onName: (name: string) => void;
  version: number;
  pending: number;
}) {
  const { lang, t } = useI18n();
  const [period, setPeriod] = useState<Period>('week');
  const [back, setBack] = useState<0 | 1>(0);
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let live = true;
    fetchBoard(period, back)
      .then((board) => live && setLoad({ state: 'ok', board }))
      .catch(() => live && setLoad({ state: 'error' }));
    return () => {
      live = false;
    };
  }, [period, back, version]);

  const me = nameKey(name);
  const rows = load.state === 'ok' ? load.board.rows : [];
  const top = rows.slice(0, TOP);
  const mine = rows.findIndex((r) => nameKey(r.name) === me);
  const shown = name && mine >= TOP ? [...top, rows[mine]] : top;

  return (
    <section className="card" style={{ display: 'grid', gap: 'var(--s-4)' }} aria-labelledby="board-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <h2 id="board-title" style={{ font: 'var(--t-feature)', margin: 0 }}>
          {t('board.title')}
        </h2>
        {load.state === 'ok' && (
          <span style={{ font: 'var(--t-small)', color: 'var(--text-muted)' }}>
            {formatRange(load.board, lang)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <Toggle
          label={t('board.period')}
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'week', label: t('board.week') },
            { value: 'month', label: t('board.month') },
          ]}
        />
        <Toggle
          label={t('board.when')}
          value={back}
          onChange={setBack}
          options={[
            { value: 0, label: t('board.current') },
            { value: 1, label: t('board.previous') },
          ]}
        />
      </div>

      {load.state === 'loading' && <Muted>{t('board.loading')}</Muted>}
      {load.state === 'error' && <Muted>{t('board.unavailable')}</Muted>}
      {load.state === 'ok' && rows.length === 0 && <Muted>{t('board.empty')}</Muted>}

      {shown.length > 0 && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--s-1)' }}>
          {shown.map((row, i) => {
            const isMe = !!name && nameKey(row.name) === me;
            return (
              <li
                key={nameKey(row.name)}
                aria-current={isMe ? 'true' : undefined}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5ch minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 'var(--s-3)',
                  padding: 'var(--s-2) var(--s-3)',
                  borderRadius: 'var(--r-standard)',
                  background: isMe ? 'var(--surface-card)' : 'transparent',
                  // Separate a far-down own row from the top of the list.
                  marginTop: i === TOP ? 'var(--s-2)' : 0,
                }}
              >
                <span
                  style={{
                    font: 'var(--t-caption-bold)',
                    color: row.rank === 1 ? 'var(--accent)' : 'var(--text-muted)',
                    textAlign: 'right',
                  }}
                >
                  {row.rank}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--t-caption-bold)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.name}
                    {isMe && (
                      <span style={{ font: 'var(--t-small)', color: 'var(--text-muted)', marginLeft: 6 }}>
                        ({t('board.you')})
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'block', font: 'var(--t-small)', color: 'var(--text-muted)' }}>
                    {t('board.detail', { rounds: row.rounds, wins: row.wins })}
                  </span>
                </span>
                <span style={{ font: 'var(--t-body-bold)', whiteSpace: 'nowrap' }}>
                  {t('board.points', { n: row.points.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') })}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <NameField name={name} onName={onName} />

      {pending > 0 && (
        <p style={{ font: 'var(--t-small)', color: 'var(--text-warning)', margin: 0 }}>
          {t('board.pending', { n: pending })}
        </p>
      )}
    </section>
  );
}

function NameField({ name, onName }: { name: string; onName: (name: string) => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (name && !editing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s-2)' }}>
        <span style={{ font: 'var(--t-small)', color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t('board.playingAs', { name })}
        </span>
        <button
          className="pill pill--outlined pill--muted"
          style={{ padding: '4px 12px', flexShrink: 0 }}
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          {t('board.change')}
        </button>
      </div>
    );
  }

  const cleaned = cleanName(draft);
  return (
    <form
      style={{ display: 'grid', gap: 'var(--s-2)' }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!cleaned) return;
        onName(cleaned);
        setEditing(false);
      }}
    >
      {!name && (
        <p style={{ font: 'var(--t-small)', color: 'var(--text-muted)', margin: 0 }}>{t('board.namePrompt')}</p>
      )}
      <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
        <label htmlFor="player-name" className="visually-hidden">
          {t('board.nameLabel')}
        </label>
        <input
          id="player-name"
          className="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('board.nameLabel')}
          maxLength={MAX_NAME_LENGTH * 2}
          autoComplete="nickname"
          style={{ padding: 'var(--s-2) var(--s-4)' }}
        />
        <button type="submit" className="pill pill--accent" disabled={!cleaned} style={{ flexShrink: 0 }}>
          {t('board.save')}
        </button>
        {name && (
          <button type="button" className="pill pill--muted" style={{ flexShrink: 0 }} onClick={() => setEditing(false)}>
            {t('board.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

function Toggle<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 'var(--s-1)' }}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={opt.value === value ? 'pill pill--accent' : 'pill pill--muted'}
          style={{ padding: '6px 12px' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ font: 'var(--t-caption)', color: 'var(--text-muted)', margin: 0 }}>{children}</p>;
}

/**
 * "29 Sept – 5 Oct", in the board's own time zone rather than the viewer's,
 * so everyone sees the same boundaries. `to` is exclusive, hence the -1.
 */
function formatRange(board: Board, lang: string): string {
  const shift = board.utcOffset * 60 * 60 * 1000;
  const fmt = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return `${fmt.format(board.from + shift)} – ${fmt.format(board.to - 1 + shift)}`;
}
