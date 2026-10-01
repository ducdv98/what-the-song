# Publish tool and first COS migration

Status: done
Blocked by: 06, 09

See `docs/adr/0003-clips-in-private-cos-bucket.md`.

Add `--publish` to `tools/ingest.py` (or a standalone `tools/publish.py`), using the Python COS SDK. In order:
1. Upload every `*.mp3` and `cover-*.jpg` COS does not already have. Never overwrite an existing key. Skip `done.json` and any other ingest metadata.
2. Verify every file the new catalogue mentions exists in COS.
3. Only then upload `catalogue.json` (`Cache-Control: no-store`).
4. Print what was added.

`--dry-run` prints the plan without uploading. `--prune` deletes orphaned keys, off by default and always preceded by a listed dry-run. Publishing happens only when asked; a bare ingest still writes only the local folder. Uploader credentials come from the laptop environment and are never in the repo or on the VPS.

Then run the migration (the user's own step, after their current ingest finishes):
1. Create the bucket and sub-accounts per issue 09.
2. Full publish of the existing library (about 2,400 files, 185 MB, 401 songs, all of them).
3. Compare the COS object count with the local uploadable count; fetch a few signed URLs from the VPS.
4. Set `COS_*` in `.env` and restart the API.
5. Keep the VPS copy and Caddy mount for at least a week of soak; delete only on the user's decision.

Update the README (ingest, growing the library, deploy, auth-covers-clips sentence) and `docker-compose.yml` comments.

## Done when
- A fresh `--publish` after adding songs makes them playable with no SSH or rsync step.
- Running it twice uploads nothing the second time.
- The catalogue is never published before all its assets are in COS (test with a missing file).
- `done.json` is never uploaded.
- README documents the new flow and the rollback.

## Comments

Publish tool implemented (--publish/--dry-run/--prune in tools/ingest.py, offline tests, README and compose docs). The bucket setup, full migration and VPS soak are the owner's manual steps, documented in the README.
