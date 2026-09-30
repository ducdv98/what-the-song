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
| Web Audio playback | not started |
| Game loop / UI | not started |

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
./tools/ingest.py seed.jsonl --out ./clips
```

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

**Recommended:** constrain guesses to an **autocomplete** over the catalogue.
That turns scoring from a fuzzy-matching problem into an ID comparison, and
leaves this module doing search ranking, where being slightly wrong is
survivable.

## A note on scope

Downloading audio from YouTube is contrary to its Terms of Service, and
"non-commercial" doesn't technically cure that. What keeps this in personal-use
territory is that it stays private: **auth-gated, not publicly indexed, audio
not redistributed.** If it ever goes public, the licensing analysis in
`docs/RESEARCH.md` §2.8 and §6 becomes live and needs real answers first.
