# `/food` route and the first catalogue

Status: needs-triage
Blocked by: 01, 02, 03, 04

Serve `/food` through the registry and renderer registry, with `/` still redirecting to `/songs`. After the owner corrects the candidate list from issue 01, ingest about 60 Dishes and publish them.

## Done when
- `/food` plays end to end with the real catalogue, and rounds record topic `food` with the Dish id as `subject_id` and the region as `facet`.
- Score, Streak and the Leaderboard include Food, and the per-Topic view works.
- The catalogue is balanced across Tiers and regions, and every Dish shows its Credit.
- README and `docs/` mention the Food Topic and its photo licensing rule.

## Comments

### RESUME POINT: local ingest paused at Dish 37 of 80 (2026-10-02)

First local ingest (no COS publish) was stopped on purpose after Wikimedia rate-limited photo downloads (429 with `Retry-After: 600`, repeatedly).

- **Done:** Dishes 1-36 of `.scratch/food/candidates.jsonl` are downloaded to `apps/web/public/assets/food/` (gitignored, one valid JPG per folder, each with a `source.json`). No `catalogue.json` yet: it is written only when a run finishes all rows.
- **Next row:** 37, Bún chả cá, then 38-80.
- **To continue:** `python tools/ingest_food.py .scratch/food/candidates.jsonl` from the repo root with `.venv` active. It is resumable: finished Dishes cost a metadata call only, and the tool waits out `Retry-After` (up to 15 min). Expect the remaining ~44 downloads to hit more 429s; raise `PAUSE` in `tools/ingest_food.py` (2s now) to about 10-15s so they stop.
- **Still open before publishing:**
  1. The owner has not yet reviewed the candidate list (Tiers, regions, Aliases, Credit wording, thin Tây Nguyên set). Edit the seed first: a changed `commons_url` re-downloads that Dish, but anything already published to COS is never overwritten.
  2. Check a few crops in `/food` after the run completes.
  3. `--publish` needs `COS_BUCKET`, `COS_REGION`, `COS_UPLOAD_SECRET_ID`, `COS_UPLOAD_SECRET_KEY` (none set in the current shell). Run `--publish --dry-run` first.
  4. Then finish this ticket's "Done when" list (route plays with the real catalogue, Credit shown, docs).
