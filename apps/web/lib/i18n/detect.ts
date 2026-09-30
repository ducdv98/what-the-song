/**
 * Pick a starting language.
 *
 * This is a static export, so there is no server to read an Accept-Language
 * header and no IP geolocation. Two signals are available in the browser and
 * neither costs a permission prompt or a network call:
 *
 *   1. navigator.languages — what the person has actually configured.
 *   2. The IANA time zone — a decent proxy for location.
 *
 * Browser language wins, because it is a stated preference rather than an
 * inference. The time zone is only consulted when the language list says
 * nothing about Vietnamese: someone in Ho Chi Minh City running an English OS
 * still likely wants the Vietnamese copy for a Vietnamese song game.
 *
 * Pure and parameterised so it can be tested without a browser.
 */

export const LANGUAGES = ['vi', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];

export const DEFAULT_LANG: Lang = 'vi';

/** Time zones that imply Vietnam. Asia/Saigon is the deprecated alias. */
const VN_TIME_ZONES = new Set(['Asia/Ho_Chi_Minh', 'Asia/Saigon']);

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v);
}

export function detectLang(
  languages: readonly string[] = [],
  timeZone?: string | null,
): Lang {
  for (const raw of languages) {
    // Match the subtag, so "vi", "vi-VN" and "VI" all count, but "vintage"
    // does not.
    const tag = raw.toLowerCase().split('-')[0];
    if (tag === 'vi') return 'vi';
    if (tag === 'en') return 'en';
    // Any other language: keep looking rather than settling immediately, in
    // case Vietnamese or English appears further down the preference list.
  }
  if (timeZone && VN_TIME_ZONES.has(timeZone)) return 'vi';
  return languages.length > 0 ? 'en' : DEFAULT_LANG;
}

/** Read the live browser signals. Returns the default outside a browser. */
export function detectFromBrowser(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  let tz: string | undefined;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Intl can be unavailable or throw in constrained environments.
  }
  const langs = navigator.languages?.length
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];
  return detectLang(langs, tz);
}
