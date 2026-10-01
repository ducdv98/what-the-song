# Topics: from a song game to a guessing platform

Status: ready-for-agent
Vocabulary: `CONTEXT.md` (Topic, Subject, Clue, Clip, Reveal, Facet, Tier). Architecture decision: `docs/adr/0002-topic-packages.md`.

## Goal

Make the app able to host more kinds of guessing than Songs, starting with People (a face photo revealed from the hair down). **This effort is the architecture only**: Songs keep working exactly as today, every Round records its Topic, and a second Topic can be added without touching the core. People content, licensing and its UI are a separate follow-up (issue 07).

## Decisions

1. One app, many **Topics**. Accounts, Score, Streak and Leaderboard are global; each Round records its Topic, so a per-Topic view is a query.
2. The guessed thing is a **Subject**; a Song is a Subject of Songs, a Person of People.
3. A **Stage** shows a **Clue**. Songs: a Clip (pre-cut audio). People: a Reveal (top *n*% of one full photo, done in the browser; cheating is accepted). Score depends on a Stage's position in the ladder, not on Topic or ladder length (`scoreForStep` already does this).
4. Packages: `@wts/core` (renamed from `@wts/game`: Round, Stage, Score, Streak, Leaderboard, the `Topic` contract, shared Vietnamese accent folding), `@wts/topic-songs`, `@wts/topic-people`, and `@wts/topics` (registry shared by API and web). Web renderers live in `apps/web`, keyed by Topic id.
5. A `Topic` value supplies: id, how a Subject's Clues become an ordered ladder, its matcher, its catalogue validator, and its declared Facets. Each Topic owns its Guess matcher. People starts with the Songs rule (full name or Alias after accent folding, no partial credit).
6. Tier is shared (same five levels, absent means medium). Genre becomes a generic optional **Facet** a Topic declares.
7. The Topic id is a plain string checked against the registry, never a DB enum.
8. Data: `rounds.song_id` becomes `subject_id`, a `topic` column defaults existing rows to `songs`, `rounds.genre` becomes `facet`. Existing rounds and stats must survive.
9. Assets and catalogues: `/assets/<topic>/` with one ingest tool per Topic. Old `/clips/...` URLs redirect.
10. Routes: `/[topic]` (`/songs`, `/people`); `/` redirects to `/songs` while only one Topic is playable. Product name unchanged.
11. People Reveal fractions are fixed per Topic (e.g. 15/35/60/85/100% from the top), with an optional per-Person override in the Subject's shape.

## Known code facts

- `round.ts` / `ladder.ts` treat a Stage as seconds with five audio targets (`STAGE_TARGETS`); this must become a Topic-neutral ladder. `tools/ingest.py` mirrors `STAGE_TARGETS` and a test enforces it.
- One catalogue at `/clips/catalogue.json`, mounted from `apps/web/public/clips`, served by Caddy, fetched at runtime by `app/page.tsx`.
- `RoundReport`, `rounds` and `player_stats` are Song/Genre-shaped; the API trusts the browser's reports.

## Out of scope

People content, photo licensing and sourcing, the product name, partial-name matching, new filters beyond Facet.

## Issues

Vertical slices; each leaves the app working. Order is by number; see `Blocked by:` in each file.

01 core rename and Topic contract · 02 Songs extracted · 03 registry · 04 neutral ladder, Tier, Facet · 05 data migration and contracts · 06 asset layout · 07 `/[topic]` routes · 08 People Topic (follow-up)
