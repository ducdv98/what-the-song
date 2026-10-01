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
| Vietnamese answer matching | done, tested — `packages/game/src/vietnamese.ts` |
| Clip ingest pipeline | written, **not yet run against real audio** — `tools/ingest.py` |
| Web Audio playback | done — `apps/web/lib/audio/engine.ts` |
| Round rules | done, tested — `packages/game/src/round.ts` |
| Autocomplete search | done, tested — `packages/game/src/catalogue.ts` |
| Game UI | done — Next.js + [`DESIGN.md`](DESIGN.md) |
| Round + result screens (SongSpot-style) | done, verified in a browser — see [How a round works](#how-a-round-works) |
| Difficulty tiers + genre filter | done, tested |
| Cover art | done, tested — thumbnail per song, `--covers` backfill |
| Streaks | done, tested |
| Vietnamese / English UI | done, tested in-browser |
| Accounts (guest / register / sign in) | done, tested — NestJS + Postgres, [`apps/api/`](apps/api/README.md) |
| Weekly / monthly leaderboard | done, tested against Postgres and in a browser — see [Leaderboard](#leaderboard) |
| Deployment | done — Docker + Caddy + Postgres, optional basic auth |

`npm test` runs every workspace's tests plus ingest; `npm run test:e2e` runs
the account service end to end against a real Postgres. The game still builds
to a static export.

Read [`docs/RESEARCH.md`](docs/RESEARCH.md) before changing anything in
`packages/game/src/vietnamese.ts` or `tools/ingest.py`. Both exist in the shape
they do for specific reasons, and §10 records the decisions that got them here.

## Repository layout

A monorepo: npm workspaces, with [Turborepo](https://turborepo.com) running
tasks in dependency order and caching their results.

```
apps/
  web/          @wts/web        the game — Next.js static export: UI, Web Audio,
                                i18n, browser storage, the API client
  api/          @wts/api        accounts and player records — NestJS + Postgres
packages/
  game/         @wts/game       the rules, with no DOM, audio, storage or network:
                                Vietnamese matching, catalogue search, rounds,
                                scoring, difficulty, genres, streaks
  contracts/    @wts/contracts  the API's wire format: request/response shapes,
                                error codes, account input rules
tools/                          clip ingest and seed validation (Python)
docker/                         web + api Dockerfiles, Caddyfile
docs/                           research and the catalogue guide
```

Dependencies only point one way: apps depend on packages, never the reverse,
and the two packages do not depend on each other.

- **`@wts/game` is shared by both apps.** The browser plays with it and the
  API judges reported rounds with the same code — the difficulty list and score
  bounds the server validates against are the ones the game used, not a copy.
- **`@wts/contracts` is the API's wire format.** The NestJS DTOs implement its
  request types and the web client is typed against its response types, so a
  renamed field or a new error code breaks the build on both sides at once.
  The registration form's `pattern`/`minLength` come from it too, so browser
  validation and server validation cannot disagree.

Packages compile to `dist/` (ESM + declarations) and apps consume that, so each
app keeps its own toolchain (Next's bundler, Nest's `tsc`). Package sources use
`.ts` import specifiers, which lets their tests run straight from source under
`node --experimental-strip-types`; `rewriteRelativeImportExtensions` turns them
into `.js` in the build. Turborepo builds packages before anything that needs
them (`dependsOn: ["^build"]`), so there is no manual ordering to remember.

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

## Growing the library

[`docs/CATALOGUE.md`](docs/CATALOGUE.md) is the instruction for adding songs —
written to be handed to an agent, and equally usable by hand. It covers the row
format, the ordered genre rules, how to pick a YouTube URL, which songs are
worth adding, and a distribution target for 1000 songs.

Validate every batch before ingesting:

```sh
python tools/validate_seed.py seed.jsonl
```

It catches what nobody re-reading a thousand-line file would: duplicate ids
(which silently overwrite another song's clips), the same song added twice under
different spellings, unknown genres (which file a song under "Khác" with no
error), and titles still carrying `(Official MV)` — which make a round
unwinnable, because the answer no longer matches what a player types. It also
prints genre coverage against the targets so you can see what to fill next.

Exit code is 1 on errors, 0 on warnings only.

## Building the clip library

**macOS / Linux:**

```sh
pip install -U yt-dlp      # not youtube-dl, which is unmaintained
brew install ffmpeg        # or: sudo apt install ffmpeg

cp tools/seed.example.jsonl seed.jsonl   # then add your songs
./tools/ingest.py seed.jsonl --out apps/web/public/clips
```

**Windows** (PowerShell) — `./tools/ingest.py` does not work there, since
Windows ignores the shebang. Call Python explicitly:

```powershell
py -m pip install -U yt-dlp
winget install ffmpeg        # or: scoop install ffmpeg
# reopen PowerShell so PATH is picked up, then check both:
ffmpeg -version; yt-dlp --version

copy tools\seed.example.jsonl seed.jsonl   # then add your songs
py tools\ingest.py seed.jsonl --out apps/web/public/clips
```

The script detects your OS and picks a cookie source itself, printing what it
chose. See [Cookies and the bot wall](#cookies-and-the-bot-wall) if downloads
start failing — on Windows there is one specific trap.

Output goes in `apps/web/public/clips/` so the app can serve it — that is the
default, so `--out` can be left off, and it works from any directory. It is
gitignored.

The seed file holds **your** canonical title, artist and aliases; the YouTube
URL is only an audio source and its title is never read. That is deliberate —
karaoke, beat, lyric-video and cover reuploads make YouTube metadata unreliable,
so the catalogue stays under your control.

Re-running skips songs already built, so you can grow the seed file over time.
The catalogue is saved after each completed song, so those songs are available
on reload even if the batch is still running or gets interrupted. To recover a
stale catalogue from existing clips without downloading anything:

```sh
python tools/ingest.py seed.jsonl --catalogue-only
```

This includes completed songs in the seed file and uses their current metadata.

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
| `"ladder": [0.5,2,8,16]` | This song's own reveal steps, at most five — ingest and the validator warn about any extra, since they would never be played. |
| `"tier": "easy"` | How well known it is: `easy` · `medium` · `hard` · `expert` · `impossible`. Picks the difficulty it plays under. Untagged plays as `medium`. |

For accurate automated vocal onset you want source separation — see
`docs/RESEARCH.md` §11.2.

### Flexible ladders

By default ingest cuts exactly the five clips a round plays — **0.1 · 0.5 · 2 ·
8 · 16 s** (`CLIP_LADDER` in `tools/ingest.py`, mirroring `STAGE_TARGETS` in
`packages/game/src/ladder.ts`; a test fails if they disagree). About **26.6 s of
audio, ~0.43 MB per song** at 128 kbps.

The ladder is per song. `--ladder 0.5,2,8,16` sets the run default; a seed row's
own `ladder` overrides it, so a hard song can open with a 2s clue while a
distinctive one still starts at 0.1s. The client derives each song's clips from
its manifest, and `stagesFor` (`packages/game/src/round.ts`) plays at most five
of them — all of them for a ladder of five or fewer, otherwise the ones nearest
each stage. A longer ladder only costs storage, so ingest and the validator
warn about it.

**Libraries built before the five-clip default** have seven clips per song
(0.1, 0.5, 1, 2, 4, 8, 16). They need no rebuild: the game plays the same five
stages from them, and the 1s and 4s clips are simply never requested.

### Cover art and editing built songs

Each song gets a cover: the video's thumbnail, centre-cropped to a 480×480
JPEG with metadata stripped. YouTube "Topic" art tracks put the album art in
the middle of the frame, so the crop lands on it. The filename is a hash of the
image — opaque, and a different image always gets a new URL, so the long cache
on `/clips` never serves a stale cover. No thumbnail is not an error; the result
screen shows a fallback.

Songs built before covers existed don't have one. Backfill them without
touching their audio:

```sh
./tools/ingest.py seed.jsonl --covers
```

Re-running ingest never rebuilds audio for a song that is already built, but it
**does re-apply your seed edits** — `title`, `artist`, `aliases`, `genre` and
`tier` — so fixing a title or tagging tiers across the library is just "edit the
seed, run ingest again".

Every run ends with a report of how many songs are in each tier (and how many
are untagged, which all play as Medium) and which songs have no cover yet:

```
difficulty tiers:
  easy            42
  medium          35
  hard            18
  expert           4
  impossible       1
  (untagged)     112   play as medium — add "tier" in the seed file

3 song(s) without a cover — the result screen shows a fallback. Run again with --covers to fetch them:
```

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
py tools\ingest.py seed.jsonl --out apps/web/public/clips

# Or export a cookies.txt from any browser and pass it:
py tools\ingest.py seed.jsonl --out apps/web/public/clips --cookies cookies.txt

# Or skip cookies — often fine from a home connection:
py tools\ingest.py seed.jsonl --out apps/web/public/clips --no-cookies
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
`packages/game/src/vietnamese.ts` handles them explicitly and the tests are numbered against
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

## Language

The UI is Vietnamese and English. The game itself is a static export (the
account API in `apps/api/` does not render pages), so there is no
`Accept-Language` header to read and no IP geolocation. Two
client-side signals are used instead, neither of which costs a permission prompt
or a network call:

1. **`navigator.languages`** — a stated preference, so it wins.
2. **The IANA time zone** (`Asia/Ho_Chi_Minh`), consulted only when the language
   list mentions neither Vietnamese nor English.

So a French browser in Vietnam gets Vietnamese, while an English browser in
Vietnam gets English — a deliberate choice: someone who set their browser to
English asked for English. A manual `VI`/`EN` toggle overrides detection and is
remembered.

Copy lives in `apps/web/lib/i18n/messages.ts`. The English table is typed against the
Vietnamese keys, so a missing translation is a compile error rather than a
Vietnamese string leaking into the English UI. Tests also assert that both
tables declare the same `{placeholders}`.

## Genres, difficulty and streaks

### Genres

Twenty genres, researched against how Vietnamese listeners and catalogues
actually divide the repertoire rather than translated from an Anglophone list
(`docs/RESEARCH.md` §5, §13):

- **Contemporary** — `nhac-tre` `ballad` `rap-viet` `indie` `rock-viet`
  `rnb-soul` `dance-edm` `acoustic`
- **Era & movement** — `bolero` `nhac-vang` `tien-chien` `nhac-do` `hai-ngoai`
  `nhac-trinh`
- **Traditional** — `dan-ca` `cai-luong` `co-truyen`
- **Provenance** — `nhac-phim` `thieu-nhi` `khac`

Several of these overlap on purpose, so **[`docs/CATALOGUE.md`](docs/CATALOGUE.md)
holds an ordered decision procedure** — apply the rules in order and take the
first match. Consistency across a thousand rows matters more than any single
judgement call, and there is no cheap way to re-audit tags later.

Tag songs with the slug in the seed file's `genre` field. The picker only offers
genres that actually have songs, with counts — with a few hundred hand-curated
tracks most slugs stay empty for a long time, and a picker full of dead ends is
worse than a short one. Unknown or missing tags fall under **Khác**, so no song
becomes unreachable, and ingest warns about an unrecognised slug because it is
almost always a typo.

The slug list exists in both `tools/ingest.py` and `packages/game/src/genres.ts`; a test
parses the TypeScript and asserts they agree, since a silent drift would file
songs under Khác with no error.

### Difficulty

Difficulty is **how well known the songs are**, as on SongSpot: each song
carries a `tier` in the seed file, and the chips on the round screen pick the
pool. The rules of a round are identical at every tier.

| Tier | Meaning (see `docs/CATALOGUE.md` §5 for how to choose) |
|---|---|
| Dễ · Easy | Everyone knows it — the biggest hits |
| Vừa · Medium | Well known to anyone who listens to the genre |
| Khó · Hard | Known, but not a hit you hear everywhere |
| Chuyên gia · Expert | Fans of the artist or era know it |
| Bất khả · Impossible | Deep cuts |

An untagged song plays as Medium, so an untagged library still works while the
tagging catches up. A tier with no songs shows as a disabled chip, so it is
visible what is still missing. The seed validator prints the count per tier.

The guess search always covers **every** song, not just the current tier — a
list limited to one tier would narrow the answer for you.

### Streaks

Current streak, best streak, games played and win rate. A loss resets the
current streak and never the best. Where they live depends on who is playing —
see [Guests and accounts](#guests-and-accounts).

For guests, storage is best-effort: in a private window, with site data
blocked, or during a thumbnail capture the accessor itself can throw. Every
access is guarded and anything read back is coerced, so a corrupt or stale value
yields zeroes rather than `NaN` in the UI — losing a streak is a far better
outcome than a blank page.

## How a round works

Modelled on SongSpot, whose round screen was studied directly rather than
guessed at (screenshots of every state were compared side by side).

1. **Five stages: 0.1s → 0.5s → 2s → 8s → 16s.** Every round starts on the
   shortest.
2. **Play** the clip. The timeline under the difficulty chips is drawn to scale
   — 0.1s is a sliver, 16s most of the bar — and while a clip plays a lighter
   fill sweeps across it, driven by the audio clock itself
   (`AudioEngine.progress`), not a timer. Measured in a real browser: an 8s clip
   plays for 8.02–8.04s and the playhead sits at 25.1% of the bar halfway
   through (expected 25%).
3. **Search and pick** a song; the box shows "Title — Artist" and the button
   beside it turns from **Skip** into **Guess**. Typing again drops the pick.
   Picks are compared by song id, so two songs with the same title cannot be
   confused.
4. A **wrong guess or Skip opens the next stage and plays it** straight away. On
   the last stage the button is **Give up**; a wrong guess there loses too.
   There are no lives — the stages are the attempts.
5. The **result screen** replaces the round: the cover, "It was_" on a loss,
   title and artist, a stamp — *Guessed in 0.5s!* or *Lost!* — and Hear 16s,
   Share and Next / Try again. Share copies a spoiler-free row, one square per
   stage: 🟥 wrong guess, ⬛ skipped, 🟩 guessed, ⬜ not reached.

Scoring still runs underneath (1000 on the first stage down to 50 on the last)
for the leaderboard; the screen leads with the time instead.

Genre, full stats, language and how-to-play live in the **menu** (top left), so
the round screen holds nothing but the game.

## Guests and accounts

Two ways to play, and the game never waits for either:

- **Guest** — the default. Play freely, no sign-up. Stats are counted in the
  browser and kept in `sessionStorage`, so they survive a reload but are **gone
  when the tab closes**. The stats bar says so. (Before accounts existed, stats
  were kept forever in `localStorage`; that old key is now deleted on load.)
- **Account** — register with a username, email and password, then sign in with
  either the username or the email. Every finished round is sent to the API and
  stored, and the streak bar shows the server's numbers, so they follow the
  player to any device. The per-round history is what the
  [leaderboard](#leaderboard) ranks.

Signing in or out starts the stats fresh: a guest's session record is not
carried into an account, and signing out does not bring back the stats from
before signing in. A round finished as a guest is not recorded to an account.

The account service is a NestJS app in [`apps/api/`](apps/api/README.md) — its
README covers the endpoints, the token design (short-lived access token plus
rotating refresh token, both HttpOnly cookies), password hashing, and how to
scale it. If the API cannot be reached — a static-only deployment, or it is down
— the game quietly stays in guest mode and hides the sign-in buttons.

UI: `apps/web/app/components/AccountBar.tsx` (top right), `AuthDialog.tsx`
(sign in / register), `AuthProvider.tsx` (who is playing) and `useStats.ts`
(where the numbers go). The client wrapper, including refresh-and-retry when
the access token expires, is `apps/web/lib/auth/client.ts`; a guest's
tab-scoped stats are `apps/web/lib/storage/guest-stats.ts`.

## Leaderboard

Total points per player for **this week or this month**, and the one before
each, so Monday morning is not an empty page. There is no all-time board on
purpose: a fresh week gives someone who joined late a real chance. It is in the
menu, under the stats.

- **Weeks run Monday 00:00 to Monday 00:00, months from the 1st**, at UTC+7
  (Vietnam, no daylight saving) — so a round at 00:30 on Monday counts for the
  new week even though UTC still says Sunday. `LEADERBOARD_UTC_OFFSET` on the
  API changes it. The period arithmetic is `packages/game/src/leaderboard.ts`,
  shared by the API and the browser.
- **Ranked by points**: the sum of every round's score in the period. A loss or
  a give-up adds 0 but counts as a round played. Equal points share a rank
  (1, 1, 3); wins, then fewer rounds, order players within a tie.
- **Signed-in players only.** Only their rounds are recorded, so only they are
  on it. Guests can read the board, and it offers them the sign-up buttons.
- **Straight from `rounds`**, the table every recorded round already lands in —
  one grouped query over the `played_at` index, so the board cannot disagree
  with what was played. `GET /api/leaderboard?period=week|month&back=0|1`, public,
  top 100.

The board refetches once the server has stored a finished round, so a result
shows up without a reload. Like the rest of the game, it trusts the browser
(`docs/RESEARCH.md` §10.5): the API refuses impossible rounds, not dishonest
ones.

## Running the app

Accounts need a Postgres 14+ you can reach locally. Create a role and two
databases — one for development, one the e2e tests are allowed to wipe:

```sh
psql -U postgres -c "CREATE USER wts WITH PASSWORD 'wts'"
psql -U postgres -c "CREATE DATABASE wts OWNER wts"
psql -U postgres -c "CREATE DATABASE wts_test OWNER wts"
```

```sh
npm install                                    # every workspace, one lockfile
cp apps/api/.env.example apps/api/.env         # set DATABASE_URL and JWT_ACCESS_SECRET

npm run dev          # web on http://localhost:3000, API on :4000 behind /api
npm test             # every workspace's unit tests, then ingest
npm run test:e2e     # the API end to end (needs Postgres; wipes wts_test)
npm run typecheck
npm run lint
npm run build        # packages, the static export (apps/web/out), the API (apps/api/dist)
```

`npm run dev` builds the packages once, then runs four processes together:
`tsc --watch` for each package, `next dev`, and `nest start --watch`. Ctrl+C
stops all of them. Editing a package rebuilds its `dist/`, which both apps pick
up. The Next dev server proxies `/api` to the API, so the browser sees one
origin exactly as it does behind Caddy; if the API is not running, the game
simply stays in guest mode.

To work on one app, filter: `npx turbo run dev --filter=@wts/web` (plus the
packages it needs, which turbo builds first). Running a single workspace's
script directly also works: `npm run test --workspace @wts/game`.

The TypeScript tests use Node's built-in runner (`packages/*`, `apps/web`) and
Vitest (`apps/api`); `test:ingest` is Python's unittest over `tools/`. Nothing
beyond Node and Python is needed for `npm test`.

**Moving from the pre-monorepo layout:** the clip library now lives in
`apps/web/public/clips` (Next serves it in development from there). If you
built one before, move it: `mv public/clips apps/web/public/clips`. The API's
local settings moved from `backend/.env` to `apps/api/.env`.

Next.js App Router with `output: 'export'` — the game is still a folder of
static files in `apps/web/out`. The catalogue is fetched at runtime from `/clips/catalogue.json`,
so the build does not depend on what is in your clip library; without one, the
app says so and tells you what to run.

### Audio

`apps/web/lib/audio/engine.ts` uses the **Web Audio API**, not an `<audio>` element.
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

[`DESIGN.md`](DESIGN.md) is the spec; `apps/web/app/tokens.css` is its implementation.
Two documented deviations: the proprietary Spotify fonts are replaced with an
Inter-led stack (also better for stacked Vietnamese tone marks), and the app
uses its own wordmark rather than any Spotify branding.

## Running it with Docker

```sh
./tools/ingest.py seed.jsonl --out apps/web/public/clips   # build clips first (host)
cp .env.example .env                  # set POSTGRES_PASSWORD and JWT_ACCESS_SECRET
docker compose up -d --build          # http://localhost:3000
```

Three services:

| Service | Image | Role |
|---|---|---|
| `web` | `docker/web.Dockerfile` → `caddy:2-alpine` + the static export | serves the game and clips, proxies `/api/*` to `api` |
| `api` | `docker/api.Dockerfile` (Node 22) | accounts and player records; stateless |
| `db` | `postgres:16-alpine` | the `pgdata` volume holds every account and round |

Both images build from the repo root and start with `turbo prune`, which cuts
the monorepo down to one app plus the packages it uses, with a matching
lockfile — so the web image never installs NestJS and the API image never
installs Next. The API image then drops dev dependencies and runs as the
unprivileged `node` user.

Only `web` publishes a port; the API and database are reachable only inside the
compose network. Compose refuses to start without `POSTGRES_PASSWORD` and
`JWT_ACCESS_SECRET` rather than running with a guessable default.

The API scales horizontally — `docker compose up -d --scale api=3` — and Caddy
spreads requests across the replicas; see `apps/api/README.md` for the two
things to change before relying on that (shared rate-limit storage, migrations
as a release step).

**Back up the database** — it is the only state that cannot be rebuilt:

```sh
docker compose exec -T db pg_dump -U wts wts > backup.sql
docker compose exec -T db psql -U wts wts < backup.sql      # restore
```

**The clip library is a bind mount, not part of the image.** `apps/web/public/clips` on
the host is mounted read-only at `/srv/clips`. So adding songs is:

```sh
./tools/ingest.py seed.jsonl --out apps/web/public/clips   # add more rows first
# reload the page — no rebuild, no restart
```

`catalogue.json` is served `no-store` precisely so new songs appear on reload;
clips have content-hashed names and are served `immutable` with a one-year TTL.
Keeping audio out of the image also means the image stays small and is not
itself a music library.

Change the port in `.env`, or `PORT=8080 docker compose up -d` on a shell that
supports it.

On **Windows**, this needs Docker Desktop with the WSL2 backend; the
`./apps/web/public/clips` bind mount works as-is.

### Putting it behind a password

This is a site-wide gate, separate from player accounts: accounts decide whose
record a round goes into, basic auth decides who can reach the site at all. No
gate is fine while it is only on your machine. Before you give anyone a URL,
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

> **Verified:** the images build, and the full stack (`web`, `api`, `db`) has
> been brought up with `docker compose up -d` on a VPS: the game serves 200,
> `/api/health` reports the database up, `catalogue.json` is served, and
> registering an account works through Caddy.

## Deploying on a VPS

Everything — game, API and Postgres — runs from one `docker compose`. Nothing
else (Node, Postgres, Caddy) needs installing on the host.

**Requirements:** Docker Engine with the Compose plugin, git, and ~2 GB of free
disk for the build. Prefix `docker` with `sudo` if your user is not in the
`docker` group.

### First deploy

```sh
git clone <repo-url> what-the-song && cd what-the-song

# 1. Secrets. Compose refuses to start without the first two.
cp .env.example .env && chmod 600 .env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n' | tr '/+' '_-')|" .env

# 2. Clips. They are not in git (see "The clip library is a bind mount").
#    Build them on the host, or copy an existing library from your machine:
#      rsync -avz apps/web/public/clips/ user@vps:what-the-song/apps/web/public/clips/
#    apps/web/public/clips/catalogue.json must exist.

# 3. Build and start (migrations run automatically on API start).
docker compose up -d --build

# 4. Check.
docker compose ps                          # all three "healthy"/"Up"
curl -s localhost:3000/api/health          # {"status":"ok",...}
```

The game is now on port `3000` (`PORT` in `.env`). `db` and `api` are not
published to the host.

### Updating

```sh
git pull
docker compose up -d --build     # rebuilds only what changed; the database volume is kept
```

**Updating clips needs no rebuild and no restart.** `apps/web/public/clips` is
bind-mounted read-only into the container, so rsync/ingest new files into it
and reload the page. Keep `catalogue.json` in sync with the audio files you
copy (copy it last).

### Operations

```sh
docker compose logs -f            # all services (add `api`, `web` or `db`)
docker compose restart api
docker compose down               # stop; data is kept in the pgdata volume
docker compose down -v            # stop AND DELETE all accounts and records
```

Containers use `restart: unless-stopped`, and the Docker service is enabled at
boot, so the stack comes back after a reboot. Back up the database as shown
above (a nightly `pg_dump` cron is enough).

### Before going public

1. **Put TLS in front.** The bundled Caddy listens on plain HTTP (`:80`,
   auto-HTTPS is off). Terminate HTTPS with a reverse proxy on the host (Caddy,
   nginx, or a Cloudflare Tunnel) that forwards your domain to
   `127.0.0.1:3000`, and forward `X-Forwarded-For` / `X-Forwarded-Proto`. Open
   only ports 80/443 (and 22) in the VPS firewall; to stop exposing `3000`
   directly, change the `ports:` entry in `docker-compose.yml` to
   `"127.0.0.1:${PORT:-3000}:80"`.
2. Set `COOKIE_SECURE=true` in `.env` once the site is served over HTTPS, then
   `docker compose up -d`.
3. Decide on the site-wide password (`AUTH_USER` / `AUTH_PASSWORD`, see "Putting it behind a password").
   Privacy is what keeps this in personal-use territory.

