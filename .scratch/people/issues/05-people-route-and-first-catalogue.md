# `/people` route and first catalogue

Status: done
Blocked by: 03, 04, 01

Serve `/people`, with the field Facet filter, and publish the first catalogue of about 60 Persons from the reviewed candidate list.

## Done when
- A Person is playable end to end at `/people`.
- Score, Streak and the Leaderboard record the Topic as `people`.
- The catalogue meets the launch balance: at least 8 per field, balanced across Tiers.

- The COS signer allow-list in `apps/api/src/assets/asset-urls.ts` accepts `people/<slug>/<hash>.jpg` keys, with a test (found in the issue 04 review).
- The eight candidates whose photos are not head-and-shoulders crops (listed in `.scratch/people/candidates.md`) are replaced or left out of the first catalogue.

## Comments

Done locally, not published. Codex wired the code and docs; Claude verified (typecheck, lint, full test suite, static build with `/people` generated) and fixed what the reviews found.

- `/people` is registered (renderer, metadata, loader table in `TopicPage`), the COS signer accepts `people/<slug>/<24 hex>.jpg`, and the home page lists People through the renderer registry. Codex had replaced the `/` topic picker with a redirect (my prompt repeated stale spec wording); that was reverted, and the picker and the back link on Topic pages are intact.
- The launch catalogue is `.scratch/people/launch.jsonl`: 60 Persons, 12 per field, Tiers 14 easy / 19 medium / 15 hard / 7 expert / 5 impossible. Photos are in the gitignored `apps/web/public/assets/people/`; every photo is within the head-and-shoulders range, judged from the files. The eight flagged candidates and every candidate with an out-of-range crop were replaced.
- Added `--prune` to `tools/ingest_people.py` so a removed Person's published photo can be deleted (ADR 0004 promises removal on request), with tests.

Not done, for the owner:
1. `--publish` was not run, not even `--dry-run`: it needs `COS_BUCKET`, `COS_REGION`, `COS_UPLOAD_SECRET_ID` and `COS_UPLOAD_SECRET_KEY`. Run `python tools/ingest_people.py --publish --dry-run`, then without `--dry-run`.
2. A Round was not played in a browser (needs the API and database).
3. The catalogue the browser downloads includes each Person's `sourceUrl`. It is never rendered, but it is visible in the network payload; ADR 0004 and the spec say "never shown". Decide whether to strip it from the served catalogue.

Deferred review items: per-Topic Stats and Leaderboard views in the UI (the API supports them; Food has the same gap), the nested ternary for the state heading in `TopicPage`, and `PeopleGame` repeating `FoodGame`. The ingest warns about a crop ratio only for a fresh download, not a cached photo.
