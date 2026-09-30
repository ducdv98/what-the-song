'use client';

import { useEffect, useState } from 'react';
import { authApi, type LeaderboardPeriod, type LeaderboardResponse } from '@/lib/auth/client';
import { useAuth } from './AuthProvider';
import { useI18n } from './I18nProvider';
import { radioKeys } from './radioKeys';

/** Rows shown before the list is cut; the player's own row is always shown. */
const TOP = 10;

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ok'; board: LeaderboardResponse };

/**
 * This week's or this month's board, or the one before each.
 *
 * Refetches when `version` changes — useStats bumps it once the server has
 * stored a round — so a win shows up without a reload. Guests can read it;
 * only signed-in players' rounds are recorded, so only they are on it.
 */
export function Leaderboard({ version }: { version: number }) {
  const { lang, t } = useI18n();
  const { status, user, available, openDialog } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [back, setBack] = useState<0 | 1>(0);
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let live = true;
    authApi
      .leaderboard(period, back)
      .then((board) => live && setLoad({ state: 'ok', board }))
      .catch(() => live && setLoad({ state: 'error' }));
    return () => {
      live = false;
    };
  }, [period, back, version, user?.id]);

  // Usernames are unique case-insensitively (users_username_lower_key).
  const me = user?.username.toLowerCase();
  const isMe = (name: string) => me !== undefined && name.toLowerCase() === me;
  const rows = load.state === 'ok' ? load.board.rows : [];
  const mine = rows.findIndex((r) => isMe(r.username));
  const shown = mine >= TOP ? [...rows.slice(0, TOP), rows[mine]] : rows.slice(0, TOP);
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <section style={{ display: 'grid', gap: 'var(--s-3)' }} aria-labelledby="board-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <h3
          id="board-title"
          style={{ margin: 0, font: 'var(--t-caption-bold)' }}
        >
          {t('board.title')}
        </h3>
        {load.state === 'ok' && (
          <span style={{ font: 'var(--t-small)', color: 'var(--text-muted)' }}>{formatRange(load.board, lang)}</span>
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
            const mineRow = isMe(row.username);
            return (
              <li
                key={row.username}
                aria-current={mineRow ? 'true' : undefined}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5ch minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 'var(--s-3)',
                  padding: 'var(--s-2) var(--s-3)',
                  borderRadius: 'var(--r-standard)',
                  background: mineRow ? 'var(--surface-card)' : 'transparent',
                  borderBottom: '1px solid var(--separator)',
                  // Separate a far-down own row from the top of the list.
                  marginTop: i === TOP ? 'var(--s-2)' : 0,
                }}
              >
                <span
                  style={{
                    font: 'var(--t-caption-bold)',
                    color: row.rank === 1 ? 'var(--text-negative)' : 'var(--text-muted)',
                    textAlign: 'right',
                  }}
                >
                  {row.rank}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{ display: 'block', font: 'var(--t-caption-bold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {row.username}
                    {mineRow && (
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
                  {t('board.points', { n: row.points.toLocaleString(locale) })}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {status === 'guest' && (
        <div style={{ display: 'grid', gap: 'var(--s-2)' }}>
          <Muted>{t('board.guest')}</Muted>
          {available && (
            <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
              <button className="pill pill--accent" onClick={() => openDialog('register')}>
                {t('auth.createAccount')}
              </button>
              <button className="pill" onClick={() => openDialog('login')}>
                {t('auth.signIn')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
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
    <div role="radiogroup" aria-label={label} onKeyDown={radioKeys} style={{ display: 'flex', gap: 'var(--s-1)' }}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          role="radio"
          aria-checked={opt.value === value}
          tabIndex={opt.value === value ? 0 : -1}
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
 * "28 Sept – 4 Oct", in the board's own time zone rather than the viewer's, so
 * everyone sees the same boundaries. `to` is exclusive, hence the -1.
 */
function formatRange(board: LeaderboardResponse, lang: string): string {
  const shift = board.utcOffset * 60 * 60 * 1000;
  const fmt = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${fmt.format(Date.parse(board.from) + shift)} – ${fmt.format(Date.parse(board.to) - 1 + shift)}`;
}
