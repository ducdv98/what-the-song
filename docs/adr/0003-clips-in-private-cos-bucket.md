# Clips live in a private Tencent COS bucket, served by API-signed URLs

Audio Clips and cover images (and later Person photos) move from the VPS bind mount to a private Tencent Cloud Object Storage (COS) bucket in Hong Kong or Singapore. The API hands the browser short-lived signed URLs; the bucket is never public-read. We did it to take the library off the VPS disk and to serve players from a nearer region.

We chose a private bucket with signed URLs over a public-read bucket because `docs/MUSIC-LICENSING-VN.md` treats serving clips on demand as communicating them to the public, and the README promises the optional site gate covers "the clips included". A public bucket would put the audio outside that gate behind guessable URLs. The cost is one signing request per Round, and clips no longer cache across sessions by URL.

Decisions made together:

- The API signs a Round's clips and cover in one call at Round start, with a TTL of about 30 minutes. The endpoint is open to guests and rate-limited. It signs only keys matching `<topic>/<slug>/<hash|cover-hash>.<mp3|jpg>`, at most about 12 per call, so it cannot be used to read anything else in the bucket.
- An asset-URL seam has two adapters: Caddy-local (identity, today's behaviour) and COS (signed). With no `COS_*` settings the app serves from Caddy as before, which keeps local dev and self-hosting working and makes rollback "unset `COS_*`".
- `catalogue.json` also lives in COS, signed with a short TTL and `Cache-Control: no-store`, so the VPS holds no library data.
- The audio engine caches decoded clips in memory by unsigned path, because the signed query string changes on every request.
- The local folder stays the master copy and COS is a rebuildable mirror. Only `*.mp3` and `cover-*.jpg` are uploaded; `done.json` and other ingest metadata never leave the laptop.
- Two CAM sub-accounts: the API's is read-only on this bucket, the uploader's is write-only and stays on the laptop. No root keys.
- Publishing is one command (`tools/ingest.py --publish`, Python COS SDK): upload missing assets, verify, then publish the catalogue, never overwriting an existing key. Removing songs is a separate `--prune`.
- The bucket's CORS rule allows only the production origin.

Rejected: public-read bucket (above); Tencent CDN with URL authentication up front (edge caching would restore cross-session caching, but it adds a service and does not change the signing interface, so it can come later); shelling out to `coscli`/`rclone` (another binary on every ingest machine, and the assets-before-catalogue ordering is easier in code).

Follow-up, deliberately not done here: all 401 songs already ingested were uploaded without a per-song record of their licence basis. A per-song "cleared" flag that gates upload is a separate licensing project.
