# Food ingest tool

Status: done
Blocked by: 02

Add a Food ingest tool beside `tools/ingest.py` (one tool per Topic, ADR 0002) that reads a seed file of `{ name, aliases, tier, region, commons_url }`.

- Fetch the image and its author and licence metadata from Wikimedia Commons; refuse anything other than CC BY, CC BY-SA or CC0.
- Resize to a sensible web size, store under the local master `food/<slug>/<hash>.jpg`, and write the catalogue with each Credit.
- Validate the result with the Food catalogue validator's rules (shared fixtures or the same checks), including Alias collisions.
- `--publish` follows ADR 0003: upload assets before the catalogue, never overwrite an existing key; the signer's allow-list covers `food/<slug>/<hash>.jpg`.
- Seed validation like `tools/validate_seed.py`, with tests.

## Done when
- Tests cover licence refusal, Alias collisions, and the never-overwrite rule, with Commons mocked.
- Running the tool on a small seed produces a catalogue that `@wts/topic-food` validates.

## Comments

Implemented by Codex, verified by Claude; Python and API tests pass, all 80 candidate seeds validate. Claude removed Codex's refusal to republish `food/catalogue.json`: assets are never overwritten, the catalogue is refreshed as for Songs. Commons is mocked in tests; first real run is in issue 05.
