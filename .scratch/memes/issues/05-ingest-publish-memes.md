# Publish memes to COS from ingest

Status: done
Blocked by: 01

See `spec.md` decision 11 and `docs/adr/0003-clips-in-private-cos-bucket.md`. Reuse the `publish_library` ordering and safeguards in `tools/ingest.py`.

Add `--memes <dir>` to `--publish`. The folder holds the image files and a `manifest.json` of `{file, outcome, source}` entries. The tool content-hashes each image into `memes/<hash>.<ext>`, uploads what COS lacks (never overwriting), verifies every file the catalogue names is present, and only then uploads `memes/catalogue.json` with `Cache-Control: no-store`. `--dry-run` and `--prune` work as for Songs. Reject an entry with an unknown outcome, a missing `source`, an unsupported extension or a missing file. Mirror the local layout under `apps/web/public/assets/memes/` for Caddy-local dev. Document the flow in the README, including adding a meme and rollback (unset `COS_*`).

## Done when
- Publishing twice uploads nothing the second time.
- The catalogue is never published before all its images are in COS (offline test with a missing file).
- Bad manifest entries fail before any upload.
- Nothing but images and `memes/catalogue.json` is uploaded.
- README documents the flow.
- Offline tests with the injected client cover the above.
