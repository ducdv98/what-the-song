/**
 * Genre taxonomy for a Vietnamese catalogue.
 *
 * Deliberately not Songspot's Pop / Hip-Hop / Rock / R&B / Country / K-Pop —
 * see docs/RESEARCH.md §5. Vietnamese listeners think in different categories,
 * and forcing this repertoire into Anglophone genre labels loses most of what
 * distinguishes it. Using the native taxonomy is also a differentiator.
 *
 * `slug` is what goes in the seed file's "genre" field and in catalogue.json.
 * `label` is Vietnamese, `gloss` is a short English hint for anyone who needs it.
 */

export interface Genre {
  slug: string;
  label: string;
  gloss: string;
}

/**
 * Note on nhạc vàng and nhạc đỏ: both carry real generational and political
 * connotations in Vietnam. They are here because a Vietnamese catalogue is
 * incomplete without them, and they are presented as plain catalogue labels —
 * the UI should not editorialise either way.
 */
export const GENRES: readonly Genre[] = [
  { slug: 'nhac-tre', label: 'Nhạc trẻ', gloss: 'Contemporary pop' },
  { slug: 'rap-viet', label: 'Rap Việt', gloss: 'Vietnamese hip-hop' },
  { slug: 'indie', label: 'Indie', gloss: 'Indie & bedroom pop' },
  { slug: 'bolero', label: 'Bolero', gloss: 'Bolero ballads' },
  { slug: 'nhac-vang', label: 'Nhạc vàng', gloss: 'Pre-1975 popular song' },
  { slug: 'nhac-do', label: 'Nhạc đỏ', gloss: 'Revolutionary song' },
  { slug: 'dan-ca', label: 'Dân ca', gloss: 'Folk' },
  { slug: 'vong-co', label: 'Vọng cổ', gloss: 'Southern traditional' },
  { slug: 'nhac-phim', label: 'Nhạc phim', gloss: 'Soundtrack' },
  { slug: 'khac', label: 'Khác', gloss: 'Other' },
] as const;

const BY_SLUG = new Map(GENRES.map((g) => [g.slug, g]));

export function findGenre(slug: string | null | undefined): Genre | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

export function isKnownGenre(slug: string | null | undefined): boolean {
  return Boolean(slug && BY_SLUG.has(slug));
}

/**
 * Genres actually present in a catalogue, in taxonomy order, with counts.
 *
 * Only offering genres that exist avoids a picker full of dead ends — with a
 * few hundred hand-curated songs most slugs will be empty for a long time.
 * Anything with an unrecognised or missing genre is counted under "khac" so no
 * song becomes unreachable through the picker.
 */
export function availableGenres(
  songs: { genre?: string | null }[],
): { genre: Genre; count: number }[] {
  const counts = new Map<string, number>();
  for (const song of songs) {
    const slug = isKnownGenre(song.genre) ? song.genre! : 'khac';
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return GENRES.filter((g) => counts.has(g.slug)).map((genre) => ({
    genre,
    count: counts.get(genre.slug)!,
  }));
}

/** Filter to one genre, or return everything when no genre is selected. */
export function filterByGenre<T extends { genre?: string | null }>(
  songs: T[],
  slug: string | null,
): T[] {
  if (!slug) return songs;
  if (slug === 'khac') {
    // "Khác" is the catch-all, so it must also collect unknown and missing tags.
    return songs.filter((s) => !isKnownGenre(s.genre) || s.genre === 'khac');
  }
  return songs.filter((s) => s.genre === slug);
}
