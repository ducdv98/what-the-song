'use client';

/**
 * A row of selectable pills — DESIGN.md §4 "Dark Pill", accent when active.
 *
 * Shared by both pickers so they cannot drift apart visually. Rendered as a
 * radiogroup so keyboard and screen-reader users get the right semantics for
 * "pick exactly one".
 */
export function PillRow<T extends string | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; hint?: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <p
        style={{
          font: 'var(--t-small-bold)',
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: '0 0 var(--s-2)',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              role="radio"
              aria-checked={active}
              title={opt.hint}
              onClick={() => onChange(opt.value)}
              className={active ? 'pill pill--accent' : 'pill pill--muted'}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span style={{ opacity: 0.6, marginLeft: 6 }}>{opt.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
