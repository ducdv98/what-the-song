import { isTier, looseKey, type TierSlug } from '@wts/core';
import { isField, type Field } from './fields.ts';

export interface Person {
  id: string;
  name: string;
  aliases?: string[];
  tier?: TierSlug | null;
  field: Field;
  photo: string;
  sourceUrl: string;
  revealFractions?: number[];
}

export interface Reveal {
  photo: string;
  fraction: number;
}

/** One shared ladder to tune for every Person. */
export const REVEAL_FRACTIONS = [0.15, 0.35, 0.6, 0.85, 1] as const;

export function ladderFor(person: Person): Reveal[] {
  return (person.revealFractions ?? REVEAL_FRACTIONS).map((fraction) => ({
    photo: person.photo, fraction,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSourceUrl(value: unknown): value is string {
  if (!nonEmpty(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isRevealFractions(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === REVEAL_FRACTIONS.length &&
    value.at(-1) === 1 && value.every((fraction: unknown, index: number) =>
      typeof fraction === 'number' && Number.isFinite(fraction) &&
      fraction > 0 && fraction <= 1 &&
      (index === 0 || fraction > value[index - 1]));
}

/** Validate untrusted People catalogue data and cross-Person Alias collisions. */
export function validateCatalogue(data: unknown): Person[] {
  if (!Array.isArray(data)) throw new Error('Invalid People catalogue: expected an array');
  const ids = new Set<string>();
  const names = new Map<string, number>();
  const aliases = new Map<string, number>();

  for (const [index, value] of data.entries()) {
    if (!isRecord(value) ||
        !nonEmpty(value.id) || !/^[a-z0-9][a-z0-9-]*$/.test(value.id) || !nonEmpty(value.name) ||
        !nonEmpty(value.photo) || !/^[A-Za-z0-9][\w.-]*$/.test(value.photo) ||
        (value.aliases !== undefined &&
          (!Array.isArray(value.aliases) || !value.aliases.every(nonEmpty))) ||
        (value.tier !== undefined && value.tier !== null && !isTier(value.tier)) ||
        !isField(value.field) || !isSourceUrl(value.sourceUrl) ||
        (value.revealFractions !== undefined && !isRevealFractions(value.revealFractions))) {
      throw new Error(`Invalid People catalogue entry at index ${index}`);
    }

    if (ids.has(value.id)) throw new Error(`Duplicate Person id: ${value.id}`);
    ids.add(value.id);

    const nameKey = looseKey(value.name);
    if (!nameKey) throw new Error(`Invalid Person name at index ${index}`);
    if (aliases.has(nameKey) && aliases.get(nameKey) !== index) {
      throw new Error(`Person name collides with another Person's Alias at index ${index}`);
    }
    names.set(nameKey, index);

    for (const alias of (value.aliases ?? []) as string[]) {
      const key = looseKey(alias);
      if (!key) throw new Error(`Invalid Person Alias at index ${index}`);
      if ((names.has(key) && names.get(key) !== index) ||
          (aliases.has(key) && aliases.get(key) !== index)) {
        throw new Error(`Person Alias collides with another Person at index ${index}`);
      }
      aliases.set(key, index);
    }
  }
  return data as Person[];
}
