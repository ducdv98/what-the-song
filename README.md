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
| Genre + difficulty pickers | done, tested |
| Streaks | done, tested |
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

**macOS / Linux:**

```sh
pip install -U yt-dlp      # not youtube-dl, which is unmaintained
brew install ffmpeg        # or: sudo apt install ffmpeg

cp tools/seed.example.jsonl seed.jsonl   # then add your songs
./tools/ingest.py seed.jsonl --out public/clips
```

**Windows** (PowerShell) — `./tools/ingest.py` does not work there, since
Windows ignores the shebang. Call Python explicitly:

```powershell
py -m pip install -U yt-dlp
winget install ffmpeg        # or: scoop install ffmpeg
# reopen PowerShell so PATH is picked up, then check both:
ffmpeg -version; yt-dlp --version

copy tools\seed.example.jsonl seed.jsonl   # then add your songs
py tools\ingest.py seed.jsonl --out public/clips
```

The script detects your OS and picks a cookie source itself, printing what it
chose. See [Cookies and the bot wall](#cookies-and-the-bot-wall) if downloads
start failing — on Windows there is one specific trap.

Output goes in `public/clips/` so the app can serve it. It is gitignored.

The seed file holds **your** canonical title, artist and aliases; the YouTube
URL is only an audio source and its title is never read. That is deliberate —
karaoke, beat, lyric-video and cover reuploads make YouTube metadata unreliable,
so the catalogue stays under your control.

Re-running skips songs already built, so you can grow the seed file over time.
### Where the clue starts

This matters more than clip length. Vietnamese pop usually opens with 8–30s of
generic instrumental — piano, pads, strings — which is interchangeable between
songs, so a clue taken from the start is unguessable *however long it runs*.

The default therefore anchors at a deterministic point **30–45% into the track**
(`anchor: "hook"`), which on a 4-minute song is verse two or a chorus. The run
prints every anchor with its position so you can see it cleared the intro:

```
anchors (where each clue starts):
    31.33s (  35% in)  [hook]  Sơn Tùng M-TP — Nơi Này Có Anh
    28.38s (  32% in)  [hook]  Binz — Bigcityboi
```

Per song, in the seed file:

| Field | Effect |
|---|---|
| `"anchor": "hook"` | 30–45% in. **Default.** No detection, nothing to tune. |
| `"anchor": "intro"` | Just past leading silence — the song's real opening. |
| `"anchor": "body"` | Loudness-step heuristic aiming at the vocal entry. **Experimental and unvalidated** — listen before trusting it. |
| `"start_at": 42.0` | Exact offset. Beats every mode; the reliable fix. |
| `"ladder": [0.5,1,2,4,8,16]` | This song's own reveal steps. |

For accurate automated vocal onset you want source separation — see
`docs/RESEARCH.md` §11.2.

### Flexible ladders

The ladder is per song, not a global constant. `--ladder 0.5,1,2,4,8,16` sets
the run default; a seed row's own `ladder` overrides it, so a hard song can open
with a 2s clue while a distinctive one still starts at 0.1s. The client derives
each song's rungs from its clip manifest, so whatever clips exist *are* the
ladder — there is no constant to keep in sync. Scoring scales to the ladder's
length, so the first rung is always worth the most.

Budget roughly **0.5 MB per song** for the full seven-step reveal ladder.

### Troubleshooting

**`NameError: name 'detect_os' is not defined`** — fixed; update to the latest
commit. A refactor deleted a block of functions. `tools/test_ingest.py` now runs
`main()` end to end, which catches exactly this.

**`UnicodeEncodeError: 'charmap' codec can't encode character`** — fixed; update
to the latest commit. Python on Windows defaults file writes and subprocess
decoding to cp1252, which cannot represent Vietnamese. Every such call now
passes `encoding="utf-8"` explicitly. Re-running is safe: songs that crashed
before their `done.json` was written are simply rebuilt.

**No sound, or "Unable to decode audio data"** — clips must be MP3. An earlier
version cut them as AAC, which cannot be decoded by `decodeAudioData` in
Chromium builds without proprietary codecs, making the game silently unplayable
there. Re-run ingest to regenerate; `libmp3lame` is now used and a test enforces
it. Opus in WebM is half the size and also royalty-free, but `decodeAudioData`
for WebM has been unreliable in Safari, which rules it out when players are on
iPhones.

**Clip length problems reported at the end of a run** — the ffmpeg cut did not
match the ladder. Each clip is measured with ffprobe after cutting, so this
surfaces instead of producing a silently broken catalogue. It should not happen:
clips are cut from PCM WAV, where ffmpeg's seek is sample-exact (verified at
0.000s deviation across all seven rungs). If it does, check that `normalise()`
produced a `.wav` — on a compressed input, `-ss` before `-i` would snap to a
keyframe.

### Cookies and the bot wall

YouTube scores automated requests and will eventually demand "Sign in to confirm
you're not a bot". Cookies from a signed-in browser are what get you past it, so
the script auto-detects one and tells you which it picked.

⚠️ **On Windows, Chrome and every other Chromium browser are unusable for this.**
Chrome 127+ encrypts cookies with app-bound encryption that ties the key to the
Chrome process, so no external tool can read them and there is **no local
workaround**. Edge, Brave, Opera and Vivaldi all inherit it. The script knows
this and will not even try — on Windows it only ever offers Firefox.

So on Windows, pick one:

```powershell
# Easiest: install Firefox, sign in to YouTube once, then just run it.
py tools\ingest.py seed.jsonl --out public/clips

# Or export a cookies.txt from any browser and pass it:
py tools\ingest.py seed.jsonl --out public/clips --cookies cookies.txt

# Or skip cookies — often fine from a home connection:
py tools\ingest.py seed.jsonl --out public/clips --no-cookies
```

Firefox stores cookies in plain SQLite, which is why it works everywhere.
`--cookies-from-browser BROWSER` overrides the detection if you need it.

If the script reports no cookies and downloads still succeed, you do not need
any of this — a home connection is often scored well enough on its own. Only
reach for cookies once you actually see the bot check.

Two more things worth knowing: **run this on your own machine, never a VPS** —
datacenter IPs are scored far below residential ones, so ingest from a cloud box
hits the bot wall constantly (`docs/RESEARCH.md` §10.3). And when downloads
start failing across the board, **update yt-dlp first**; it is an arms race and
the fix is usually just a newer version.

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

## Genres, difficulty and streaks

### Genres

The taxonomy is Vietnamese, not Songspot's Pop / Hip-Hop / Rock / R&B / Country /
K-Pop — forcing this repertoire into Anglophone labels loses most of what
distinguishes it (`docs/RESEARCH.md` §5):

`nhac-tre` · `rap-viet` · `indie` · `bolero` · `nhac-vang` · `nhac-do` ·
`dan-ca` · `vong-co` · `nhac-phim` · `khac`

Tag songs with the slug in the seed file's `genre` field. The picker only offers
genres that actually have songs, with counts — with a few hundred hand-curated
tracks most slugs stay empty for a long time, and a picker full of dead ends is
worse than a short one. Unknown or missing tags fall under **Khác**, so no song
becomes unreachable, and ingest warns about an unrecognised slug because it is
almost always a typo.

The slug list exists in both `tools/ingest.py` and `lib/game/genres.ts`; a test
parses the TypeScript and asserts they agree, since a silent drift would file
songs under Khác with no error.

### Difficulty

Difficulty is a **game mode**, not a per-song rating. Per-song difficulty should
come from real play data seeded with a popularity proxy (`docs/RESEARCH.md` §1),
and we have neither — inventing a rating would be a guess dressed up as data. So
it adjusts the rules instead, which needs no metadata:

| Mode | First clue | Lives | Skips |
|---|---|---|---|
| Dễ | 3rd rung (1s) | 5 | yes |
| Thường | 2nd rung (0.5s) | 3 | yes |
| Khó | 1st rung (0.1s) | 3 | yes |
| Cực khó | 1st rung (0.1s) | 1 | **no** |

0.1s is genuinely brutal, so it sits under *Khó* rather than being the default.
Starting later caps the achievable score, so easier honestly means fewer points.
A start rung beyond a song's own (shorter) ladder is clamped.

### Streaks

Current streak, best streak, games played and win rate, in `localStorage`. A loss
resets the current streak and never the best.

Storage is per-viewer and best-effort: in a private window, with site data
blocked, or during a thumbnail capture the accessor itself can throw. Every
access is guarded and anything read back is coerced, so a corrupt or stale value
yields zeroes rather than `NaN` in the UI. A static export has no better option —
losing a streak is a far better outcome than a blank page.

## Running the app

```sh
npm install
npm run dev          # http://localhost:3000
npm test             # 74 tests (web + ingest), no dependencies
npm run build        # static export to out/
```

`npm test` runs both suites: `test:web` (Node's built-in runner over the
TypeScript modules) and `test:ingest` (Python's unittest over
`tools/ingest.py`). Neither needs anything installed beyond Node and Python.

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

Change the port in `.env`, or `PORT=8080 docker compose up -d` on a shell that
supports it.

On **Windows**, this needs Docker Desktop with the WSL2 backend; the
`./public/clips` bind mount works as-is.

### Putting it behind a password

No auth is fine while it is only on your machine. Before you give anyone a URL,
set both variables — privacy is what keeps this in personal-use territory
(`docs/RESEARCH.md` §10.1):

Copy `.env.example` to `.env` and fill it in — this works the same on every
platform, and avoids PowerShell's lack of the inline `VAR=value cmd` form:

```ini
PORT=3000
AUTH_USER=friends
AUTH_PASSWORD=pick-something
```

```sh
docker compose up -d
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
