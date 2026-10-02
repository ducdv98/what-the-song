# Sign meme keys through the asset seam

Status: done
Blocked by: none

See `spec.md` decisions 7-9 and `docs/adr/0003-clips-in-private-cos-bucket.md`.

Let the asset-signing endpoint accept `memes/<hash>.<webp|jpg|png>` and `memes/catalogue.json`, and nothing broader. Keep the existing patterns and the cap on keys per call. `memes/catalogue.json` gets the short catalogue TTL and the Caddy-local adapter returns `/assets/memes/...` as it does for everything else.

## Done when
- The signer accepts a meme image key and `memes/catalogue.json`.
- It still rejects keys outside the allow-list: other extensions, path traversal, nested paths under `memes/`, uppercase hashes.
- Existing song and cover keys behave as before.
- Unit tests cover each accepted and rejected shape for both adapters.
