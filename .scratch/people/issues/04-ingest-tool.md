# People ingest tool

Status: done
Blocked by: 02

A People tool takes a seed file of `{ name, aliases, tier, field, photo_url, source_url }`, downloads each image, and writes the catalogue and assets under `people/<slug>/`.

- Refuses a seed row with no `source_url`, an unknown field or an unreadable image.
- Warns when the image is not a head-and-shoulders crop (aspect ratio check).
- Same local-master and never-overwrite publish rules as ADR 0003.

## Done when
- Tests cover each refusal and a successful ingest.
- A seed of a few Persons produces a catalogue the validator accepts.

## Comments

Implemented by Codex (stopped by its usage limit near the end; finished and verified by Claude): `tools/validate_people_seed.py` and `tools/ingest_people.py` with tests, `test:ingest` updated, and `tools/ingest.py` publish generalised from Food to Food and People. All ingest tests pass, and `.scratch/people/candidates.jsonl` validates. The Codex reviews found two cache bugs, now fixed with tests: a corrupt cached photo was trusted by filename, and a non-object `source.json` crashed. A seed test no longer requires more than 50 rows.

Deferred, for issue 05: the COS signer allow-list in `apps/api/src/assets/asset-urls.ts` rejects `people/<slug>/<hash>.jpg` keys, so a published People photo could not be served until it is extended and tested. Also deferred: request pacing, retries, JPEG conversion and seed normalisation repeat the Food tools; a shared helper means editing the Food tools, which had unrelated uncommitted edits.
