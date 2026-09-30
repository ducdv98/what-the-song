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
 * Twenty genres, researched against how Vietnamese listeners and catalogues
 * actually divide the repertoire rather than translated from an Anglophone
 * list. docs/CATALOGUE.md holds the ordered rules for choosing between them —
 * read that before adding songs, because several of these overlap and a
 * thousand rows tagged inconsistently is worse than a coarser taxonomy.
 *
 * Note on nhạc vàng and nhạc đỏ: both carry real generational and political
 * connotations in Vietnam. They are here because a Vietnamese catalogue is
 * incomplete without them, and they are presented as plain catalogue labels —
 * the UI should not editorialise either way.
 */
export const GENRES: readonly Genre[] = [
  // ── Contemporary. Most of a modern library lands here. ──────────────────
  { slug: 'nhac-tre', label: 'Nhạc trẻ', gloss: 'Contemporary V-pop' },
  { slug: 'ballad', label: 'Ballad', gloss: 'Ballad' },
  { slug: 'rap-viet', label: 'Rap Việt', gloss: 'Vietnamese hip-hop' },
  { slug: 'indie', label: 'Indie', gloss: 'Indie & bedroom pop' },
  { slug: 'rock-viet', label: 'Rock Việt', gloss: 'Vietnamese rock' },
  { slug: 'rnb-soul', label: 'R&B / Soul', gloss: 'R&B and soul' },
  { slug: 'dance-edm', label: 'Dance / EDM', gloss: 'Dance and electronic' },
  { slug: 'acoustic', label: 'Acoustic', gloss: 'Acoustic & unplugged' },

  // ── Era and movement. These are defined by when and where a song came
  //    from, not by its rhythm, which is why they sit apart from the above.
  { slug: 'bolero', label: 'Bolero', gloss: 'Bolero' },
  { slug: 'nhac-vang', label: 'Nhạc vàng', gloss: 'Pre-1975 Southern popular song' },
  { slug: 'tien-chien', label: 'Nhạc tiền chiến', gloss: 'Pre-war romantic song' },
  { slug: 'nhac-do', label: 'Nhạc đỏ', gloss: 'Revolutionary & patriotic song' },
  { slug: 'hai-ngoai', label: 'Nhạc hải ngoại', gloss: 'Overseas Vietnamese' },
  // An auteur category, not a style. Vietnamese catalogues really do list
  // Trịnh Công Sơn's songbook on its own, and players think of it that way.
  { slug: 'nhac-trinh', label: 'Nhạc Trịnh', gloss: 'Trịnh Công Sơn songbook' },

  // ── Traditional. The rarer classical forms are deliberately pooled under
  //    co-truyen: a guessing game needs genres whose songs people can name,
  //    and a pill holding three ca trù pieces nobody can title is a dead end.
  { slug: 'dan-ca', label: 'Dân ca', gloss: 'Folk song' },
  { slug: 'cai-luong', label: 'Cải lương', gloss: 'Reformed opera & vọng cổ' },
  { slug: 'co-truyen', label: 'Nhạc cổ truyền', gloss: 'Classical & ceremonial forms' },

  // ── Provenance, used only when no style above is a better fit. ──────────
  { slug: 'nhac-phim', label: 'Nhạc phim', gloss: 'Soundtrack' },
  { slug: 'thieu-nhi', label: 'Nhạc thiếu nhi', gloss: "Children's song" },
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
