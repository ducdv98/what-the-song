# what-the-song

A guess-the-song game for Vietnamese music. A short clip plays — 0.1 seconds to
start — and you name the track, trading score for a longer clip when you need
one.

Private hobby project, played with friends and colleagues. Not a product, not
commercial, not public.

## State

| Piece | Status |
|---|---|
| Technical research | done — [`docs/RESEARCH.md`](docs/RESEARCH.md) |
| Vietnamese answer matching | done, tested — `lib/vietnamese.ts` |
| Clip ingest pipeline | written, **not yet run against real audio** — `tools/ingest.py` |
| Web Audio playback | done — `lib/audio/engine.ts` |
| Round rules | done, tested — `lib/game/round.ts` |
| Autocomplete search | done, tested — `lib/catalogue.ts` |
| Game UI | done — Next.js + [`DESIGN.md`](DESIGN.md) |
| Deployment | done — Docker + Caddy, optional basic auth |

54 tests pass (`npm test`); `npm run build` produces a static export.

Read [`docs/RESEARCH.md`](docs/RESEARCH.md) before changing anything in
`lib/vietnamese.ts` or `tools/ingest.py`. Both exist in the shape they do for
specific reasons, and §10 records the decisions that got them here.

## How it fits together

Ingest runs on **your machine**, not the server:

```
  your laptop (residential IP, browser cookies)      the server
  ─────────────────────────────────────────────      ──────────────────────
  yt-dlp  →  ffmpeg: level, cut, strip metadata  →   short opaque clips only
                                                     never talks to YouTube
```

YouTube scores datacenter IPs harshly for automated extraction, so running
yt-dlp from a VPS means constant "confirm you're not a bot" failures. Keeping
ingest local sidesteps that entirely — and leaves the server holding nothing
but short, metadata-stripped clips. See `docs/RESEARCH.md` §10.3.

## Building the clip library

```sh
pip install -U yt-dlp      # not youtube-dl, which is unmaintained
                           # also needs ffmpeg + ffprobe on PATH

cp tools/seed.example.jsonl seed.jsonl   # then add your songs
./tools/ingest.py seed.jsonl --out public/clips
```

Output goes in `public/clips/` so the app can serve it. It is gitignored.

The seed file holds **your** canonical title, artist and aliases; the YouTube
URL is only an audio source and its title is never read. That is deliberate —
karaoke, beat, lyric-video and cover reuploads make YouTube metadata unreliable,
so the catalogue stays under your control.

Re-running skips songs already built, so you can grow the seed file over time.
The run ends with a **review list** of tracks whose clip may start on an intro
or dialogue — Vietnamese MVs often open with a skit, and silence detection
cannot see past speech. Fix those with `start_at`, or set `anchor: "hook"` to
pick a mid-track point instead.

Budget roughly **0.5 MB per song** for the full seven-step reveal ladder.

## Answer matching

Vietnamese input breaks naive string comparison in about ten different ways, so
`lib/vietnamese.ts` handles them explicitly and the tests are numbered against
`docs/RESEARCH.md` §3.1:

- players type with no diacritics at all (`em cua ngay hom qua` must count)
- tone-mark placement varies and both forms are in real use (`hoà` / `hòa`)
- NFC vs NFD, with up to three code points per syllable
- legacy-encoding mojibake in scraped metadata
- `đ` has no Unicode decomposition, so stripping marks misses it
- Telex sequences when the IME is off
- bilingual titles, release noise, `feat.` chains, artist aliases

```sh
npm test
```

Requires Node 22+ (uses the built-in test runner and type stripping — no
dependencies).

Guessing is **autocomplete-constrained**: the player picks a real catalogue
entry, so a win is an ID comparison rather than a fuzzy match, and this module
does search *ranking* instead — where being slightly wrong is survivable.

## A note on scope

Downloading audio from YouTube is contrary to its Terms of Service, and
"non-commercial" doesn't technically cure that. What keeps this in personal-use
territory is that it stays private: **auth-gated, not publicly indexed, audio
not redistributed.** If it ever goes public, the licensing analysis in
`docs/RESEARCH.md` §2.8 and §6 becomes live and needs real answers first.

## Running the app

```sh
npm install
npm run dev          # http://localhost:3000
npm test             # 54 tests, no dependencies
npm run build        # static export to out/
```

Next.js App Router with `output: 'export'` — there is no server, so deploying is
"copy `out/` and `public/clips/` somewhere private". The catalogue is fetched at
runtime from `/clips/catalogue.json`, so the build does not depend on what is in
your clip library; without one, the app says so and tells you what to run.

### Audio

`lib/audio/engine.ts` uses the **Web Audio API**, not an `<audio>` element.
Seeking `<audio>` lands on a codec frame boundary and `setTimeout` pausing
carries tens of milliseconds of jitter — at a 0.1s target that is a 20–50%
error, which would make the shortest clue meaningless.
`AudioBufferSourceNode.start(when, offset, duration)` is sample-accurate.

Three details worth knowing before changing it:

- **The context is created on first click, not on mount.** Mobile Safari starts
  contexts suspended and will not autoplay, so construction has to originate in
  a real user gesture. One context per session, never one per round.
- **Playback duration is clamped to the ladder step, not the file length.** The
  ingest pipeline seeks with `-ss` before `-i`, which can overshoot to a
  keyframe, so a clip may be longer than nominal. Trusting the file would leak
  extra audio and quietly make an early clue easier.
- **Each rung is its own file**, so a player can only hold the audio they have
  actually unlocked. `decodeAudioData` needs a whole buffer, so this is the only
  real enforcement — see `docs/RESEARCH.md` §4.2.

### Design

[`DESIGN.md`](DESIGN.md) is the spec; `app/tokens.css` is its implementation.
Two documented deviations: the proprietary Spotify fonts are replaced with an
Inter-led stack (also better for stacked Vietnamese tone marks), and the app
uses its own wordmark rather than any Spotify branding.

## Running it with Docker

```sh
./tools/ingest.py seed.jsonl --out public/clips   # build clips first (host)
docker compose up -d --build                      # http://localhost:3000
```

Two stages: `node:22-alpine` runs `next build`, and the static export is served
by `caddy:2-alpine`. The runtime image carries no Node process — there is no
server to run.

**The clip library is a bind mount, not part of the image.** `public/clips` on
the host is mounted read-only at `/srv/clips`. So adding songs is:

```sh
./tools/ingest.py seed.jsonl --out public/clips   # add more rows first
# reload the page — no rebuild, no restart
```

`catalogue.json` is served `no-store` precisely so new songs appear on reload;
clips have content-hashed names and are served `immutable` with a one-year TTL.
Keeping audio out of the image also means the image stays small and is not
itself a music library.

Change the port with `PORT=8080 docker compose up -d`.

### Putting it behind a password

No auth is fine while it is only on your machine. Before you give anyone a URL,
set both variables — privacy is what keeps this in personal-use territory
(`docs/RESEARCH.md` §10.1):

```sh
AUTH_USER=friends AUTH_PASSWORD='pick-something' docker compose up -d
```

The entrypoint bcrypt-hashes the password at startup and generates the
`basic_auth` block; with the variables unset it writes an empty snippet and logs
a warning instead. Auth covers **every** route, the clips included — gating the
page while leaving the audio open would be pointless.

`robots` is set to `noindex, nofollow` and Caddy sends `X-Robots-Tag` to match,
but those are requests to crawlers, not access control. The password is the
access control.

> **Verified:** the Caddy config validates in both auth modes, and end-to-end
> against a real build: app serves 200, `catalogue.json` comes back `no-store`,
> clips come back `audio/mp4` + `immutable`, a missing clip 404s, and with auth
> on every route returns 401 without credentials and 200 with them.
> **Not verified:** the image itself has never been built — this container has
> the Docker CLI but no daemon. `docker compose build` is the one step still
> untested.
