/**
 * Vietnamese text normalisation for free-text matching.
 *
 * See docs/RESEARCH.md §3 for why each of these exists. Every transform here
 * traces back to a real way Vietnamese input breaks naive string comparison.
 *
 * Two keys come out of this module:
 *
 *   looseKey()  drops every diacritic. Suitable for tolerant free-text matching.
 *   toneKey()   keeps tones but makes their *placement* canonical, so "hoà"
 *               and "hòa" collapse together. Useful when feedback distinguishes
 *               exact spelling from accent-folded spelling.
 */

// Tone marks (dấu): huyền, sắc, ngã, hỏi, nặng.
const TONE_MARKS = ['̀', '́', '̃', '̉', '̣'];
const TONE_SET = new Set(TONE_MARKS);

// Vowel modifiers (circumflex, breve, horn). These are part of the *letter*,
// not the tone, so toneKey keeps them where they are.
const COMBINING_RANGE = /[̀-ͯ]/g;

/** Bracketed segments: "(Remix)", "[Official MV]", "{Beat}". */
const BRACKETED = /[([{][^)\]}]*[)\]}]/g;

/** feat. / ft. / featuring — and everything after, which is a name list. */
const FEAT = /\s*\b(?:feat|ft|featuring|with)\b\.?\s.*$/i;

/**
 * Release noise that shows up in YouTube titles and store metadata. Stripped
 * for matching, kept for display.
 */
const NOISE = new RegExp(
  '\\s*\\b(?:' +
    [
      'official\\s+(?:mv|music\\s+video|audio|video|lyric(?:s)?\\s+video)',
      'music\\s+video', 'lyric(?:s)?\\s+video', 'lyric(?:s)?',
      'mv', 'm/v', 'audio', 'video', 'visualizer',
      'karaoke', 'beat', 'instrumental', 'acoustic',
      'remix', 'cover', 'live', 'demo',
      'ost', 'original\\s+soundtrack',
      'hd', 'hq', '4k',
    ].join('|') +
    ')\\b\\.?',
  'gi',
);

/** Separators used in "ARTIST | TITLE | Official MV" style titles. */
const SEPARATORS = /\s*[|–—]\s*/g;

/**
 * Repair UTF-8 bytes that were read as Latin-1 — the realistic mojibake case
 * when scraping Vietnamese metadata ("HÃ y Trao Cho Anh").
 *
 * Deliberately conservative: it only commits to the re-decode when the result
 * contains Vietnamese-range characters and the input carried the telltale
 * Ã/Â/Æ lead bytes. A wrong repair is worse than none.
 */
export function repairMojibake(input: string): string {
  if (!/[ÃÂÆáº»¿]/.test(input)) return input;
  try {
    const bytes = Uint8Array.from(input, (c) => c.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Accept only if we gained Vietnamese-specific characters.
    if (/[ăâđêôơưĂÂĐÊÔƠỪ-̣]/.test(decoded.normalize('NFD'))) {
      return decoded;
    }
  } catch {
    // Not valid UTF-8 underneath; the input was fine as-is.
  }
  return input;
}

/**
 * Move every tone mark to the end of its word so that tone *placement*
 * variants collapse.
 *
 * "hoà" is h+o+a+grave; "hòa" is h+o+grave+a. Both are in real use and
 * Vietnamese orthography is not settled on which is correct, so both must
 * match. Extracting the tone and re-appending it at a fixed position makes the
 * two identical without throwing the tone away.
 */
export function foldTonePlacement(input: string): string {
  return input
    .split(/(\s+)/)
    .map((word) => {
      if (/^\s*$/.test(word)) return word;
      const decomposed = word.normalize('NFD');
      let tones = '';
      let letters = '';
      for (const ch of decomposed) {
        if (TONE_SET.has(ch)) tones += ch;
        else letters += ch;
      }
      // Recompose letters (keeps modifiers attached), then tones in a fixed
      // order so multi-tone oddities are still deterministic.
      const orderedTones = TONE_MARKS.filter((t) => tones.includes(t)).join('');
      return letters.normalize('NFC') + orderedTones;
    })
    .join('');
}

/**
 * Drop every diacritic and fold đ → d.
 *
 * Note: Postgres `unaccent` will not do the đ fold on its own — đ has no
 * canonical decomposition, so stripping combining marks leaves it untouched.
 * That is a silent bug if you push this down into SQL; hence doing it here.
 */
export function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_RANGE, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Strip bracketed noise, feat. lists, release markers and separators. */
export function cleanTitle(input: string): string {
  return input
    .replace(BRACKETED, ' ')
    .replace(FEAT, ' ')
    .replace(SEPARATORS, ' ')
    .replace(NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Collapse to words only: lowercase, punctuation → single spaces.
 *
 * \p{M} must stay in the keep-set. Combining tone marks are category Mn, so
 * dropping them here would silently throw away the marks foldTonePlacement
 * just repositioned and leave toneKey tone-blind.
 */
function collapse(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * A diacritic-free key for matching. Diacritic-free, noise-free, punctuation-free.
 */
export function looseKey(input: string): string {
  return collapse(stripDiacritics(cleanTitle(repairMojibake(input)).normalize('NFC')));
}

/**
 * Tone-preserving key with canonical tone placement.
 */
export function toneKey(input: string): string {
  return collapse(foldTonePlacement(cleanTitle(repairMojibake(input)).normalize('NFC')));
}
