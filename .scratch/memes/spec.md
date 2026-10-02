# Memes: a reaction image when a Round ends

Status: ready-for-agent
Vocabulary: `CONTEXT.md` (Meme, Round, Score). Hosting extends `docs/adr/0003-clips-in-private-cos-bucket.md`.

## Goal

When a Round is won or lost, the result card shows a funny still image (a **Meme**) picked for that outcome. It is decoration only: no effect on Score, Streak or the Leaderboard.

## Decisions

1. Trigger is the **Round outcome** (won or lost) on the `ResultCard`. No meme after individual mid-Round Guesses.
2. One **global pool** for every Topic, split into won and lost memes. Selection is random, never the same Meme twice in a row for the same outcome.
3. Still images only (webp, jpg, png). Text is baked into the image, so there is no i18n and the alt text is empty (the stamp already announces the outcome). No motion, so nothing to do for `prefers-reduced-motion`.
4. Placement: between the stamp and the cover/title in `ResultCard`. The Song title/artist reveal stays the focus.
5. A "Memes on/off" setting, default on, remembered in localStorage next to the other remembered choices (language, genre).
6. The share text and `shareSquares` are unchanged.
7. Hosting: the private COS bucket, key `memes/<hash>.<webp|jpg|png>`, listed by a signed `memes/catalogue.json`. Each entry has `file`, `outcome` (`won` | `lost`) and `source` (provenance only, not a gate).
8. The signer's key allow-list gains that one pattern. The Round-start signing call also signs one won and one lost Meme (2 extra keys, within the cap of about 12), so the result appears instantly.
9. With no `COS_*` settings, memes are served by Caddy from `apps/web/public/assets/memes/` through the identity adapter.
10. An empty pool, a missing catalogue or an image that fails to load means no Meme is shown. No placeholder, no error, no blocked Round. The feature must be safe to ship before any meme is uploaded.
11. `tools/ingest.py --publish --memes <dir>`: a local folder with a `manifest.json` is the master, COS is the mirror. Same ordering (assets, verify, then catalogue), never overwrites a key, `--dry-run` and `--prune` apply. No upload of anything but the image files and the catalogue.

## Known code facts

- `ResultCard.tsx` is typed to `Round<Song, number>`, but the Meme part depends only on `round.status`.
- The signer allow-list is the `ASSET_KEY` regex in `apps/api/src/assets/assets.controller.ts`; the browser seam is `apps/web/lib/assets/urls.ts` (`assetUrls.prepare` / `resolve`), called from `Game.tsx` at Round start.
- `publish_library` in `tools/ingest.py` publishes one Topic folder and derives the Topic from the folder name.

## Out of scope

- Choosing by Stage or Tier, per-Topic pools, captions, English variants.
- Memes after each Guess, animated memes, sharing the image.
- A per-meme licence gate.
- Sourcing the actual memes (the owner's job).

## Tickets

01 signer-and-seam, 02 pool-and-pick, 03 result-card-meme, 04 memes-setting, 05 ingest-publish-memes
