# People: a Topic of Vietnamese public figures

Status: ready-for-agent
Vocabulary: `CONTEXT.md` (Person, Reveal, Alias, Tier, Facet). Architecture: `docs/adr/0002-topic-packages.md` (Topic packages), `docs/adr/0003-clips-in-private-cos-bucket.md` (assets in COS), `docs/adr/0004-person-photos-without-licence.md` (photos without licence). Supersedes `.scratch/topics/issues/08-people-topic.md`.

## Goal

Add the People Topic: the player guesses a Vietnamese public figure from a face photo revealed from the hair down over five Stages. It uses the existing Topic contract, registry, `/[topic]` routes and asset pipeline; the shared core does not change.

## Decisions

1. Subject is a **Person**: a public figure with an established public profile. Never a private individual or a minor. Removed, with their photo, on request.
2. Clue is **Reveal**: the top part of one head-and-shoulders photo, from the hair down, in fixed fractions per Topic (15/35/60/85/100% from the top, one array to tune), with an optional per-Person override. Five Stages. The full photo goes to the browser; cheating is accepted.
3. Ingest requires a head-and-shoulders crop, so fixed fractions fit every Person. No face-anchor machinery.
4. Matching follows Songs and Food: the name or an Alias, accent-folded, no partial credit. The canonical name is the one the public knows (stage name or handle); real names and other handles are Aliases. `validateCatalogue` rejects an Alias equal to another Person's name or Alias.
5. One Facet, **field**: Ca sĩ, Diễn viên, MC / Hài, Streamer, Influencer. One value per Person, the area they are best known for. "Artist" is not a value. Labels in vi and en. Thể thao only if athletes are added later.
6. Tier is fame among Vietnamese players in general, not within the Person's field.
7. Photos are any photo already published online. No licence check and no Credit (ADR 0004). Each Person stores the photo's source URL, required by ingest and validation, never shown to players.
8. Package `@wts/topic-people`, registered in `@wts/topics`; Reveal renderer in `apps/web` keyed by `people`; route `/people`. `/` keeps redirecting to `/songs`; no Topic switcher.
9. Ingest: a People tool takes a seed file of `{ name, aliases, tier, field, photo_url, source_url }`, downloads the image, checks the crop shape, and writes the catalogue. Same local-master and never-overwrite publish rules as ADR 0003; assets live under `people/<slug>/`.
10. Launch: about 60 Persons, at least 8 per field, balanced across Tiers. A field that cannot reach 8 playable Persons waits for a later release. The agent drafts about 100 candidates, each with a findable photo, and the owner corrects the list.

## Out of scope

Linking a Person to the Songs they sing, a Topic switcher on the home page, partial-name matching, a second Facet axis, multi-valued fields, private individuals or minors, changes to Score, Streak or Leaderboard.

## Issues

01 candidate list research · 02 People package and catalogue contract · 03 Reveal renderer · 04 ingest tool · 05 `/people` route and first catalogue
