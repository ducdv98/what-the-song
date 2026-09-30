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
| Auth gate | **not started** — needed before anyone else plays (see below) |

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

## Before anyone else plays it

There is **no auth yet**, and the privacy of this thing is what keeps it in
personal-use territory (`docs/RESEARCH.md` §10.1). Before sharing a URL with
colleagues, put it behind a gate — a shared passphrase, basic auth at the
reverse proxy, or a private network is plenty. `robots` is already set to
`noindex, nofollow`, but that is a request to crawlers, not access control.
