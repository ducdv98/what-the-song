# Move assets and catalogue to /assets/<topic>/

Status: done
Blocked by: 02

Per-Topic folders under the public assets; `tools/ingest.py` becomes the Songs ingest tool; update Docker mount, Caddyfile rules (no-cache catalogue stays) and the web catalogue fetch. Redirect old `/clips/...` URLs.

## Done when
- A fresh ingest writes to `/assets/songs/`.
- Old clip and catalogue URLs redirect and still play.
