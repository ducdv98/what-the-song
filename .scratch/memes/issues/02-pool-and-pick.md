# Meme pool: load the catalogue and pick

Status: done
Blocked by: 01

See `spec.md` decisions 2, 7, 8, 10.

In the web app, add a small module that fetches `memes/catalogue.json` through the asset seam, validates it, and exposes a picker: given an outcome, return a random entry that differs from the previous pick for that outcome (if the pool has more than one). At Round start, request signing of one won and one lost Meme together with the Round's other assets, so they are warm when the result appears.

Failure is silent by design: a missing or invalid catalogue, or an empty outcome pool, yields "no Meme".

## Done when
- The picker never repeats the previous pick for an outcome unless it is the only entry.
- An invalid, empty or unreachable catalogue yields no Meme and logs no user-visible error.
- The two Meme keys are signed in the existing Round-start call; the key count stays within the cap.
- Unit tests cover picking, no-repeat, empty pool and a bad catalogue.
