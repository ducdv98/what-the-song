import { isTier, looseKey, type TierSlug } from '@wts/core';
import { isRegion, type Region } from './regions.ts';

export type PhotoLicence = 'CC BY' | 'CC BY-SA' | 'CC0' | `CC BY ${number}` | `CC BY-SA ${number}` | `CC0 ${number}`;

export interface Credit {
  author: string;
  licence: PhotoLicence;
  sourceUrl: string;
}

export interface FocalPoint {
  x: number;
  y: number;
}

export interface Dish {
  id: string;
  name: string;
  aliases?: string[];
  tier?: TierSlug | null;
  region?: Region | null;
  /** Bare photo filename in /assets/food/<id>/. */
  photo: string;
  focalPoint?: FocalPoint;
  obscuringLevels?: number[];
  credit: Credit;
}

export interface Zoom {
  photo: string;
  fraction: number;
  obscuring: number;
  focalPoint?: FocalPoint;
}

/** One shared ladder to tune for every Dish. */
export const ZOOM_FRACTIONS = [0.25, 0.4, 0.6, 0.8, 1] as const;
export const OBSCURING_LEVELS = [1, 0.75, 0.5, 0.25, 0] as const;

export function ladderFor(dish: Dish): Zoom[] {
  return ZOOM_FRACTIONS.map((fraction, index) => ({
    photo: dish.photo,
    fraction,
    obscuring: (dish.obscuringLevels ?? OBSCURING_LEVELS)[index]!,
    ...(dish.focalPoint ? { focalPoint: dish.focalPoint } : {}),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPhotoLicence(value: unknown): value is PhotoLicence {
  return typeof value === 'string' && /^(?:CC BY(?:-SA)?(?: [1-4](?:\.\d)?)?|CC0(?: 1\.0)?)$/.test(value);
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

function isObscuringLevels(value: unknown): value is number[] {
  return Array.isArray(value) &&
    value.length === ZOOM_FRACTIONS.length &&
    typeof value[0] === 'number' && value[0] > 0 &&
    value.at(-1) === 0 &&
    value.every((level: unknown, index: number) =>
      typeof level === 'number' && Number.isFinite(level) && level >= 0 && level <= 1 &&
      (index === 0 || level <= value[index - 1]));
}

/** Validate untrusted Food catalogue data and cross-Dish Alias collisions. */
export function validateCatalogue(data: unknown): Dish[] {
  if (!Array.isArray(data)) throw new Error('Invalid Food catalogue: expected an array');
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
        (value.region !== undefined && value.region !== null && !isRegion(value.region)) ||
        (value.focalPoint !== undefined &&
          (!isRecord(value.focalPoint) ||
            !Number.isFinite(value.focalPoint.x) || !Number.isFinite(value.focalPoint.y) ||
            (value.focalPoint.x as number) < 0 || (value.focalPoint.x as number) > 1 ||
            (value.focalPoint.y as number) < 0 || (value.focalPoint.y as number) > 1)) ||
        (value.obscuringLevels !== undefined && !isObscuringLevels(value.obscuringLevels)) ||
        !isRecord(value.credit) || !nonEmpty(value.credit.author) ||
        !isPhotoLicence(value.credit.licence) || !isSourceUrl(value.credit.sourceUrl)) {
      throw new Error(`Invalid Food catalogue entry at index ${index}`);
    }

    if (ids.has(value.id)) throw new Error(`Duplicate Dish id: ${value.id}`);
    ids.add(value.id);

    const nameKey = looseKey(value.name);
    if (!nameKey) throw new Error(`Invalid Dish name at index ${index}`);
    if (aliases.has(nameKey) && aliases.get(nameKey) !== index) {
      throw new Error(`Dish name collides with another Dish's Alias at index ${index}`);
    }
    names.set(nameKey, index);

    for (const alias of (value.aliases ?? []) as string[]) {
      const key = looseKey(alias);
      if (!key) throw new Error(`Invalid Dish Alias at index ${index}`);
      if ((names.has(key) && names.get(key) !== index) ||
          (aliases.has(key) && aliases.get(key) !== index)) {
        throw new Error(`Dish Alias collides with another Dish at index ${index}`);
      }
      aliases.set(key, index);
    }
  }
  return data as Dish[];
}
