# Serve assets from private COS via signed URLs

Status: done
Blocked by: 06

See `docs/adr/0003-clips-in-private-cos-bucket.md`.

Add an asset-URL seam with two adapters: Caddy-local (identity, today's behaviour) and Tencent COS (signed). Add an API endpoint that signs a Round's assets in one call, open to guests and rate-limited. The web app calls the seam for every clip, cover and the catalogue, so there is one code path. With no `COS_*` settings everything serves from Caddy as before.

- Allow-list: sign only keys matching `<topic>/<slug>/<hash|cover-hash>.<mp3|jpg>` (and the catalogue key), at most about 12 keys per call. Anything else is a 400.
- TTL about 30 minutes for assets; short TTL for the catalogue, whose object carries `Cache-Control: no-store`.
- The audio engine caches decoded clips in memory by unsigned path, not by signed URL.
- Config via env (`COS_BUCKET`, `COS_REGION`, API read-only secret id/key), validated in `env.validation.ts`, documented in both `.env.example` files.
- Document the bucket setup: private ACL, CORS rule for the production origin only, and the two CAM sub-accounts (API read-only on this bucket; uploader write-only, laptop only).

## Done when
- With `COS_*` unset, the game plays exactly as before (Caddy serves assets).
- With `COS_*` set, a Round plays from signed URLs; an expired URL is refetched without breaking the Round.
- A key outside the allow-list, or more than the cap, is rejected (e2e test).
- Unit tests cover both adapters; the signing endpoint is rate-limited and works for guests.
- Rollback is unsetting `COS_*` and restarting the API.

## Comments

Implemented in a7aa4d3. Verified: typecheck, lint, unit and e2e pass (allow-list, 12-key cap, guest access, rate limit). Publish tool and VPS mount removal are issue 10.
