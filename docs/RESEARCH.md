# Vietnamese "guess the song" game — pre-build technical research

**Status:** research; foundation code landed (see §10).
**Date:** 2026-09-30
**Goal:** replicate the songspot.net format, restricted to Vietnamese songs.

> ⚠️ **Read §10 before acting on §2 or §6.** The project was scoped after this
> was written: it is a **private, non-commercial game for friends and
> colleagues**, sourced from **YouTube via yt-dlp**. That supersedes the
> sourcing analysis in §2, retires the Phase 0 coverage gate in §7, and puts
> most of §6 out of scope. §3 (Vietnamese matching) and §4 (clip delivery and
> timing) survive intact and are the parts now implemented.

---

## 0. Executive summary

The gameplay is the easy part. Three things will decide whether this project
works, in order of severity:

1. **Audio rights & sourcing (existential).** The standard trick every
   Heardle clone uses — pull free 30-second previews from the iTunes Search
   API or Deezer — is the *worst possible fit* for a Vietnamese catalog,
   because the Vietnamese repertoire is concentrated on domestic platforms
   (reportedly ~85% of Vietnamese music copyright sits with Zing MP3, ~80% of
   it exclusive). The clone recipe does not transfer. **This must be measured
   before any code is written.**
2. **Vietnamese answer matching (hard, but solvable).** Diacritics, tone-mark
   placement variants, Unicode normalisation, legacy-encoding mojibake in
   scraped metadata, and users who simply type with no diacritics at all.
3. **Vietnamese regulatory surface (needs counsel, not engineering).**
   Author's rights vs master rights are separately licensed; some
   pre-1975 repertoire is separately regulated; data-localisation rules may
   apply if serving users in Vietnam.

My recommendation is a **Phase 0 coverage spike** (section 7) as a hard
go/no-go gate. Do not start on the app until it reports back.

### Confidence and source quality — read this

I could not verify the most important facts first-hand. This environment's
network policy blocked every host I needed:

- `songspot.net` — blocked, so **the feature description in section 1 is
  second-hand** and partly drawn from SEO content published by *rival*
  guess-the-song products. Treat it as a sketch, not a spec.
- `itunes.apple.com` and `api.deezer.com` — blocked (HTTP 403 from the egress
  proxy), so I could **not** run the catalogue-coverage probe that section 7
  describes. The coverage numbers do not exist yet. Nobody has measured them.

To unblock: Network access in the environment's settings (cloud environment
menu in the session title bar → Edit) — either a broader access level, or add
`itunes.apple.com`, `api.deezer.com` and `songspot.net` to the allowed
domains. Access levels are documented at
https://code.claude.com/docs/en/claude-code-on-the-web.

Claims below are tagged: **[verified]** = confirmed in primary/official
sources, **[reported]** = secondary sources only, needs checking,
**[assessment]** = my engineering judgement.

---

## 1. What we are cloning

**[reported]** The format, as best I can reconstruct it:

- A snippet of a track plays. The player names the track.
- Progressive reveal: the first clue is very short (reportedly **0.1 s**), and
  the player can trade away score for a longer clip.
- Three lives per round; unlimited rounds (not a once-a-day puzzle).
- Difficulty levels (~5) and genre filters (~14 genres: Pop, Hip-Hop, Rock,
  R&B, Country/Folk, K-Pop, …).
- Web-first, with iOS and Android apps.
- Lineage: it fills the hole Heardle left when Spotify shut Heardle down on
  2023-04-04.

**[verified]** Spotify gave no legal reason for killing Heardle — the public
statement was a refocus on "other features for music discovery", against
declining traffic (10M visits in Jan 2023 → 6M in Mar 2023). So Heardle's
death is *not* evidence that the format is legally doomed. It is also not
evidence that it is safe.

**Naming note:** `songspot.net`, `songspot.org`, `songspot.dev` and
`songspot.eowinstudio.com` are all live, distinct products. The name is
crowded. Pick a different one — the repo name `what-the-song` is fine.

### Design point the clone glosses over

**[assessment]** 0.1 s recognition only works when a song's first moment is
both *distinctive* and *near-universally familiar*. Vietnamese listening is
fragmented in ways the Anglophone chart is not — by generation and by region
(nhạc vàng / bolero vs. nhạc trẻ vs. rap Việt; Northern vs. Southern
repertoire). A flat 0.1 s opening clue will feel brutal and arbitrary to most
players. Plan for **per-song difficulty calibrated from real play data**, and
seed it with a popularity proxy rather than assuming a global curve.

---

## 2. Audio sourcing — the existential problem

### 2.1 Options, assessed

| Source | Auth | Clip | Vietnamese coverage | Blocker |
|---|---|---|---|---|
| Spotify `preview_url` | app reg. | 30 s | good-ish | **Closed to new apps** |
| Spotify Web Playback SDK | user login | full | good | Every player needs **Premium** |
| iTunes Search API | none | 30 s | **unmeasured, likely thin** | Terms bar entertainment use |
| Deezer API | none | 30 s | **unmeasured, likely thin** | Terms; coverage |
| Zing MP3 (unofficial) | — | full | **excellent** | ToS violation; signed+geo-locked |
| YouTube IFrame | none | full | excellent | ToS; leaks the answer |
| Direct licensing | contracts | any | whatever you sign | Cost, time |

### 2.2 Spotify `preview_url` — gone

**[verified]** In **November 2024** Spotify restricted a group of Web API
capabilities for **newly registered** applications, 30-second preview URLs
among them; preview URLs were also removed from multi-get `SimpleTrack`
responses. Pre-existing apps kept working — the change was not retroactive.

**Consequence:** a new project in 2026 **cannot** get Spotify preview URLs.
Every tutorial and clone repo predating late 2024 is built on a field you will
not receive. Ignore them.

### 2.3 Spotify Web Playback SDK — viable, but a funnel disaster here

**[assessment]** Requires each player to log in with **Spotify Premium**. Its
appeal is that it pushes the licensing burden onto Spotify. Its cost is that
you lose everyone without Premium at the door — and in Vietnam, where the
local free/ad-supported platforms dominate and Spotify skews young-urban, that
is most of your market. It also plays DRM-protected audio through EME, so you
cannot pre-cut clips server-side; you drive `seek` + a timed pause instead,
which is imprecise (section 4.2).

⚠️ Spotify's Developer Terms constrain what you may build on the SDK. Whether
a guessing game qualifies needs a lawyer's read, not mine.

### 2.4 iTunes Search API — free, and explicitly not for this

**[verified]** Free, no API key, returns `previewUrl` (30 s) plus artwork and
metadata. **[verified]** But Apple's terms state that previews, artwork and
similar assets may be used **only to promote Store content and not for
entertainment purposes**, and that sound samples must appear **proximate to a
Store badge**.

**[assessment]** A guessing game is entertainment. This is not a grey area you
can argue your way out of with a badge in the footer. It is the single most
common way clones are built, and it is out of compliance.

### 2.5 The Vietnamese inversion — why the clone recipe fails

**[reported]** Zing MP3 holds the largest Vietnamese library — around **85% of
Vietnamese music copyrights, ~80% of that exclusive**. Zing MP3 and NhacCuaTui
are a domestic duopoly for Vietnamese-language repertoire. Spotify (VN since
2018), Apple Music and YouTube Music all operate there but trail on local
catalogue.

This stat is from a secondary industry source and the exact figure should be
distrusted. **The direction is what matters, and the direction is decisive:**

> The free preview APIs cover international catalogue well and Vietnamese
> catalogue badly. The catalogue this product needs is precisely the catalogue
> they are worst at.

A Heardle clone for English-language pop gets ~full coverage from iTunes +
Deezer fallback. This project might get 30%. Or 70%. **Nobody knows, and the
whole plan hinges on it** — hence Phase 0.

### 2.6 Zing MP3 unofficial APIs — do not build on these

**[reported]** Multiple GitHub projects wrap `zingmp3.vn` (e.g.
`zingmp3-api-full`, `ZingMP3-API`). Streaming endpoints such as
`/api/v2/song/get/streaming` take `id`, `ctime`, `version`, `sig`, `apiKey` —
i.e. a **client-derived request signature**, plus geo-restriction on playback.

**[assessment]** Disqualifying, on four counts: (a) it breaks Zing's ToS, so
you are building a commercial product on an infringement; (b) the signing
scheme changes at VNG's convenience and takes your product down with it;
(c) geo-restriction breaks non-VN players; (d) no investor, app store reviewer
or acquirer will accept it. Fine for a weekend hack. Not a foundation.

### 2.7 YouTube — leaks the answer

**[assessment]** YouTube's ToS prohibits downloading or separating audio from
videos. The IFrame Player API is permitted, but: you cannot hide that the
answer is sitting in the page's network traffic and player state; `seekTo` +
timed pause cannot deliver a clean 0.1 s window; and a hidden/covered player
is itself a ToS problem. YouTube is Vietnam's biggest music-discovery channel,
which makes this tempting and does not make it workable.

### 2.8 Direct licensing — the only durable answer

**[verified]** **VCPMC** (Vietnam Center for Protection of Music Copyright) is
the *only* collective management organisation for music copyright in Vietnam.
It licenses hundreds of websites and apps; it collected ~**US$16.7M** in 2024,
of which **>305 billion VND (~78%)** came from digital platforms.

🔺 **The distinction that sinks naive plans:** VCPMC administers **authors'
rights** — the composition. It does **not** grant you the **master recording**
right. Playing a specific recording needs *both*:

1. composition → VCPMC (or the author directly), and
2. sound recording → the label / producer / distributor that owns that master.

A VCPMC licence alone does not make you legal. Budget and negotiate for both.

**[assessment]** Realistic licensed routes, cheapest-first:
- **Indie / direct artist deals.** Vietnam has a large indie and bedroom-pop
  scene. Small direct agreements for a few hundred tracks are achievable
  without a label's legal department, and the artists benefit from exposure.
  This is how I would launch.
- **Aggregator or distributor deal** covering a mid-size catalogue.
- **Partner with Zing MP3 / NhacCuaTui** — the correct long-term move, since
  they hold the catalogue and an embedded game is a plausible engagement
  feature for them. Slow, but it is the only route to the deep catalogue.
- **Public-domain / folk repertoire** (dân ca, older traditional works) for a
  compliant launch mode — but note: *the composition* may be public domain
  while *every available recording of it* is not.

### 2.9 What SongSpot actually does — [verified, with one caveat]

Checked properly after this was first drafted. `songspot.net` itself is
egress-blocked here, but its sibling domains publish the details, and they
confirm the inference above:

- **Metadata and preview links come from the Apple iTunes Search API** — song
  titles, artist names, artwork, preview URLs.
- **The browser requests the preview directly from Apple.** SongSpot does not
  proxy, cache or host the audio; Apple receives the player's IP and user
  agent. Clips run 0.1s up to ~15s of reveal.
- **There is no music licence.** Their terms state that recordings,
  compositions, artwork and related rights belong to their respective owners,
  that they grant no licence to copy, and that previews come from third-party
  catalogue services "governed by the relevant provider's terms".

*Caveat:* the policy text is from `songspot.org` / `songspot.co`; `songspot.net`
remained unreachable, so I am reading across sibling domains that present as the
same product family.

🔺 **The consequential detail: never touching the audio is the whole dodge.**
Because the bytes go from Apple's CDN straight to the player's browser,
SongSpot makes no copy and distributes nothing. Their exposure is therefore a
*terms* question with Apple — §2.4's "not for entertainment purposes" clause —
rather than a copyright question with labels. That is a meaningfully weaker
form of exposure than it first appears, and it is load-bearing for them.

**It does not transfer to this project**, for two reasons:

1. **Coverage.** The dodge only works for tracks Apple actually serves, which
   per §2.5 is precisely where a Vietnamese catalogue is weakest. SongSpot can
   afford this posture because it plays Anglophone pop.
2. **Downloading inverts the legal shape.** Any yt-dlp route means you
   reproduce, transcode, store and serve copies. That is a copyright question,
   not merely a terms-of-use one — strictly a bigger category of problem than
   SongSpot's, regardless of who is more visible.

⚠️ So "the incumbent is unlicensed too" is true but is **not** a defence, and
it is not even the same defence. What actually mitigates this project is §10.1:
staying private, non-commercial and un-indexed. That is a stronger basis than
anything SongSpot relies on — and it is the thing to protect.

---

## 3. Vietnamese answer matching

**[assessment]** This is where the engineering is genuinely interesting, and
where a naive `title.toLowerCase() === guess.toLowerCase()` will destroy the
game's feel.

### 3.1 Everything that goes wrong

1. **No diacritics at all.** Players routinely type `em cua ngay hom qua`.
   Non-negotiable: this must be accepted.
2. **Tone-mark placement variants.** **[verified]** `hoà` vs `hòa`, `thuý` vs
   `thúy` — both appear in real use and Vietnamese orthography itself is not
   settled on which is correct. Both must match.
3. **Unicode NFC vs NFD.** **[verified]** Vietnamese needs up to **three code
   points per syllable** when decomposed (base vowel + vowel modifier + tone
   mark). `ơ` may be `U+01A1`, or `o` + `U+031B`, or arrive with the marks in
   a different order. NFD may reorder marks in ways that do not match
   Vietnamese orthography. **Normalise both the index and the query to NFC.**
4. **Legacy-encoding mojibake.** Scraped or user-submitted catalogue metadata
   still carries VNI / TCVN3 text, which arrives as garbage in a UTF-8
   pipeline. Detect and repair at ingest.
5. **`Đ`/`đ`.** Folds to `d`. ⚠️ Postgres `unaccent` does **not** handle this
   by default — `đ` has no decomposition. Needs a custom rule file, and
   `unaccent` also will not help you with NFD input.
6. **Raw IME sequences.** With the IME off, Telex/VNI input leaks through:
   `em cuar ngayf hom qua`. Worth tolerating on the trailing tone keys.
7. **Bilingual titles.** `Hãy Trao Cho Anh` is also released as
   `Hãy Trao Cho Anh (Give It To Me)`. Both are the answer.
8. **Parenthetical noise.** `(Remix)`, `(Cover)`, `(Beat)`, `(Karaoke)`,
   `(OST)`, long `feat.` chains. Strip for matching; keep for display.
9. **Cover and remix culture.** Vietnamese repertoire is re-recorded
   relentlessly — bolero standards, `Độ Tộc`-style collab chains. One title,
   dozens of legitimate recordings. *Which recording is the answer, and does
   naming the song suffice?* This is a product decision, not a string-matching
   one. Decide it early.
10. **Artist aliases.** `Sơn Tùng M-TP` / `Sơn Tùng` / `MTP`; `Đen Vâu` /
    `Đen`. Plus every diacritic-free spelling of each.

### 3.2 Recommended approach

**Constrain the input — use autocomplete, not free text.** Heardle did this,
and it is the right call: the player picks from a typeahead over your
catalogue, so "was that guess correct" stops being a fuzzy-matching problem
and becomes an ID comparison. You still need the normalisation pipeline, but
it now serves *search ranking*, where being slightly wrong is survivable,
instead of *scoring*, where being slightly wrong is a bug report.

Pipeline, applied identically at index time and query time:

```
raw → repair legacy encoding → NFC → casefold → đ/Đ→d
    → strip combining marks (for the diacritic-free index)
    → strip parentheticals & feat. → collapse whitespace/punctuation
```

Index **both** the diacritic-preserving and the diacritic-stripped forms.
Postgres `pg_trgm` + a custom `unaccent` ruleset (for `đ`) covers ranking and
typo tolerance; add a hand-curated **alias table** per song for the cases no
algorithm will reach (bilingual titles, nicknames, famous mondegreens).

Keep free-text guessing, if you want it at all, as a secondary mode — and
accept that it needs the alias table to be good.

---

## 4. Clip delivery, timing, and anti-cheat

### 4.1 Anti-cheat

**[assessment]** Two distinct attacks:

- **Metadata leak.** If the client fetches `/audio/son-tung-chung-ta.mp3`, the
  game is over. Serve **opaque IDs**, **pre-cut clips**, short-lived **signed
  URLs**, and strip ID3 tags. Never send the answer's metadata to the client
  before the round resolves — including in the autocomplete payload.
- **Shazam.** A determined player holds up a phone. You cannot fully prevent
  this. Partial mitigations (pitch/tempo shift, filtering) degrade the
  experience for honest players and hurt recognisability, which is the whole
  game. My advice: **do not fight this** beyond keeping clips short; treat
  leaderboards as soft social proof, not competition worth cheating for.
- **Randomise clip offsets** per song so answers cannot be memorised as
  "the one that starts with the hi-hat", and so a leaked clip has limited
  reuse value.

### 4.2 Getting 0.1 s to actually be 0.1 s

**[assessment]** `<audio>` + `currentTime` + a `setTimeout` pause is
**not accurate enough** — you get tens of milliseconds of jitter, and seeks
land on codec frame boundaries. At a 100 ms target that is a 20–50% error.

Use the **Web Audio API**: `decodeAudioData` into an `AudioBuffer`, then
`source.start(when, offset, duration)`, which is sample-accurate.

Two gotchas:

1. **`decodeAudioData` needs the whole buffer.** Once the client holds the
   full clip, progressive reveal is only enforced in your UI — a player can
   pull the whole thing from memory. Real enforcement means **one request per
   reveal step**, each returning exactly that slice. That is ~5–6 round trips
   per round and more origin load, in exchange for a reveal that is actually
   a reveal. Pick deliberately; for a casual game, client-side enforcement is
   probably an acceptable trade, but make it a *decision*.
2. **Mobile Safari** requires a user gesture to unlock the `AudioContext`, and
   will not autoplay. Unlock on the first tap of the session and keep one
   context alive; do not create a context per round.

---

## 5. Catalogue and metadata

**[assessment]**

- **No usable open dataset exists.** MusicBrainz coverage of V-pop is thin and
  inconsistently romanised. You will be building and curating this yourself —
  budget real human editorial time, not a scraper sprint.
- **Popularity signal for difficulty tiers.** You need one, and there is no
  clean API. Candidates: Zing MP3 charts, Spotify VN Top 50 (public chart
  *pages*, not a supported chart API), YouTube VN music trending. All are
  scrape-shaped, all are fragile, all have ToS questions. Consider seeding
  from a hand-built list of a few hundred canonical songs and then letting
  **your own play data** drive difficulty — it is better signal anyway.
- **Genre taxonomy does not transfer.** Songspot's Pop / Hip-Hop / Rock / R&B
  / Country / K-Pop is wrong for this catalogue. Vietnamese listeners think in
  **nhạc trẻ, bolero, nhạc vàng, nhạc đỏ (cách mạng), rap Việt, indie, vọng
  cổ, dân ca**. Build the native taxonomy; it is also a differentiator.
  ⚠️ Note that `nhạc vàng` and `nhạc đỏ` carry political and generational
  freight in Vietnam — these are not neutral genre labels.

---

## 6. Regulatory and operational constraints in Vietnam

**[assessment] — all of this needs Vietnamese counsel, not my read.**

- **Pre-1975 repertoire** has historically been subject to separate approval
  requirements for public circulation. Any catalogue reaching back that far
  needs a compliance check per song, not a blanket assumption.
- **Data localisation.** Decree 53/2022 (implementing the Cybersecurity Law)
  can require certain service providers serving Vietnamese users to store user
  data in Vietnam and establish a local presence. If you hold accounts and
  play history for VN users, check whether you are in scope *before* choosing
  where to host.
- **Content moderation duty** over user-generated surfaces (usernames,
  leaderboards, any social feature).

**Latency — a real and often-missed constraint.** Vietnam's international
connectivity depends on a small number of submarine cables, and outages are
frequent and well documented. An audio game is latency-sensitive by nature.
**Host and cache in-country or in Singapore**, not US-east with a generic CDN.
Audio egress will also be your dominant variable cost — size the clip budget
early (clips × reveal lengths × bitrate).

---

## 7. Phase 0: the coverage spike (do this first)

**This is the go/no-go gate. It is a day of work and it determines the whole
architecture.** It is also the thing I was unable to run, because the egress
policy blocked `itunes.apple.com` and `api.deezer.com`.

1. Hand-build a **seed list of 300–500 Vietnamese songs** that a real player
   would be expected to know, deliberately spread across eras and genres:
   nhạc trẻ, bolero/nhạc vàng, rap Việt, indie, and a 1990s–2000s tier.
   Spread matters more than size — a list of only 2020s hits will flatter the
   result and mislead you.
2. Probe **iTunes Search** (`country=VN`) and **Deezer** for each. Record:
   match found? `previewUrl`/`preview` present? correct artist, or a
   soundalike/cover? Log the raw JSON.
3. Report **coverage by genre and by era**, not just one headline percentage.
   The failure mode to look for is coverage that collapses on exactly the
   older and more local repertoire — which is the likely outcome given §2.5.
4. Manually listen to a sample of ~20 hits. Verify the preview is the
   **right recording** and not a karaoke version, a cover, or a
   "Various Artists" compilation re-record. This is a common and silent
   failure in these catalogues.

**Decision rule:**

- **Coverage >80% with correct recordings** → the preview-API architecture is
  technically viable. The Apple terms problem (§2.4) is still unresolved and
  still needs a licensing answer before launch.
- **Coverage 40–80%** → build around a **curated licensed catalogue** from the
  start. Scope the game to what you can legally serve; the quality bar for a
  guessing game is "every song is recognisable", not "every song exists", so a
  smaller licensed catalogue is a perfectly good product.
- **Coverage <40%** → the songspot architecture does not transfer. Go direct
  to licensing (indie-first, §2.8) or a platform partnership, and design the
  product around a few hundred well-chosen songs.

⚠️ In every branch, the licensing work starts now and runs in parallel. It has
the longest lead time of anything in this project, and no amount of
engineering removes it.

---

## 8. Suggested stack (only once Phase 0 reports)

**[assessment]** Nothing here is exotic; the risk is all in sections 2 and 3.

- **Postgres** — catalogue, aliases, play history. `pg_trgm` + custom
  `unaccent` rules for Vietnamese search. Normalised columns, generated at
  write time.
- **Server-side clip pre-cutting** — ffmpeg, at ingest, into the reveal-length
  ladder. Opaque object keys; signed, short-TTL URLs.
- **Web Audio API** on the client for sample-accurate playback (§4.2).
- **Next.js or SvelteKit** web-first; the game is a web game and the apps can
  wait. Mobile web in Vietnam is the primary surface.
- **Hosting in Singapore or Vietnam**, audio behind a CDN with VN edge
  presence (§6).

### Build order

1. **Phase 0 coverage spike** ← gate, and licensing conversations opened in
   parallel
2. Catalogue schema + Vietnamese normalisation pipeline + alias table, with a
   proper test suite for §3.1 cases 1–10 (this is where the bugs live)
3. Autocomplete search over the normalised index
4. Clip pipeline + Web Audio playback with verified timing accuracy
5. Round/scoring/lives loop
6. Genre and difficulty taxonomy from play data
7. Accounts, streaks, sharing

---

## 9. Open questions for the product owner

1. **What is the legal posture?** A hobby project in the grey zone, or
   something intended to become a business? The answer changes §2 completely
   and therefore changes everything. **I need this before writing code.**
2. **Does naming the song suffice, or must the player name the right
   recording?** (§3.1 case 9 — this is the big Vietnamese-specific design
   question, and cover culture makes it unavoidable.)
3. **Unlimited rounds, or a daily puzzle?** Songspot is unlimited. A daily
   puzzle is dramatically more viral (Wordle-style shareable results) and
   needs a far smaller catalogue — which matters a great deal if §7 comes back
   with low coverage. A daily puzzle also fits a licensed-catalogue launch
   much better.
4. **Target audience:** players in Vietnam, or the global Vietnamese diaspora?
   This drives hosting, latency, data-localisation scope, and how much of the
   older repertoire matters.
5. **Free text or autocomplete?** I recommend autocomplete (§3.2).

---

## Sources

Format and background:
- https://songspot.net/genres (blocked here; listed for completeness)
- https://a2aprotocol.ai/insights/2026-songspot-guess-the-song-game — *SEO content, low trust*
- https://www.guessong.app/guides/why-spotify-previews-disappeared — *competitor content, low trust*
- https://www.digitalmusicnews.com/2023/04/14/heardle-spotify-shutdown/
- https://www.musicbusinessworldwide.com/spotify-to-shutter-music-trivia-game-heardle-less-than-a-year-after-acquiring-it/

APIs and previews:
- https://community.spotify.com/t5/Spotify-for-Developers/Missing-Preview-URL-using-Client-Credentials/td-p/6492694
- https://community.spotify.com/t5/Spotify-for-Developers/HTTP-API-Missing-preview-url-in-single-track-GET/td-p/6656678
- https://developers.brizm.dev/blog/spotify-api-changes-2026/
- https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html
- https://performance-partners.apple.com/search-api
- https://github.com/phamhiep2506/zingmp3-api-full
- https://github.com/kobato-chan1912/ZingMP3-API

Vietnamese market and rights:
- https://www.vcpmc.org/en
- https://vcpmc.org/faq.html
- https://vietnamnet.vn/en/vietnam-collects-16-7-million-in-music-royalties-in-2024-2361524.html
- https://en.vietnamplus.vn/nearly-400-billion-vnd-collected-in-music-copyright-royalties-last-year-post308000.vnp
- https://interspacemusic.com/blog/glossary/zing-mp3-nhaccuatui-vietnam-music-dsp/ — *secondary; the 85% figure comes from here*
- https://www.vietnam-briefing.com/news/music-streaming-services-in-vietnam-opportunities-and-challenges.html/
- https://en.wikipedia.org/wiki/Zing_MP3
- https://plf.vn/qa-on-copyright-law-in-vietnam-key-protection-issues-you-might-encounter-part-2/

Vietnamese text handling:
- https://github.com/undertheseanlp/underthesea/wiki/Chuẩn-hóa-text-tiếng-Việt
- https://docs.rs/vn-nlp-normalize/latest/vn_nlp_normalize/
- https://unicodefyi.com/guide/unicode-normalization-guide/


---

## 10. Addendum — decision: private game, YouTube source

**Scope as decided:** a hobby project, played by the author with friends and
colleagues. Internal, non-commercial, not a product.

**Source as decided:** YouTube, via yt-dlp.

### 10.1 What this changes, and why it is a better architecture

The coverage problem that dominated §2 **goes away**. Vietnamese repertoire
lives on YouTube — it is the country's largest music-discovery channel — so the
catalogue constraint that made the preview-API route untenable simply does not
apply. Better still, you get the **full track** rather than a 30-second
preview, which means *you* choose the clip offset instead of inheriting
whatever 30 seconds Apple decided to expose. §4's random-offset and
anti-memorisation ideas become possible rather than aspirational.

**On the legal position, once and plainly:** downloading audio is contrary to
YouTube's ToS, and "non-commercial" does not technically cure that. What it
does change is the practical risk profile, which for a private invite-only
instance is very different from a public product. The operative control is
**keep it actually private**: auth-gated, not publicly indexed, audio files not
redistributed. That is the thing that keeps this in personal-use territory, and
it is a one-line deployment decision rather than a legal project. §2.8
(licensing) and most of §6 (VCPMC, data localisation, regulatory) are **out of
scope** at this scope — revisit only if this ever goes public.

### 10.2 Use yt-dlp, not youtube-dl

**[verified]** `youtube-dl` is effectively unmaintained; its release cadence
slowed from 2020 and it breaks whenever YouTube changes its player. **`yt-dlp`**
is the actively maintained fork: ~12M PyPI downloads/month as of May 2026,
releases roughly fortnightly, >100k stars, packaged in Ubuntu since 22.04.

Use `yt-dlp`. The tool named in the original brief is the wrong one.

### 10.3 The bot wall — and the architecture it forces (most important finding)

**[verified]** YouTube scores each extraction request on IP reputation, whether
a valid **Proof-of-Origin (PO) token** minted by its BotGuard JavaScript is
present, session cookies, and recent request volume from that address.
**Datacenter ranges — every VPS, cloud instance and CI runner — are scored far
below residential connections.** One report measured roughly **1 in 4 fresh
datacenter exit IPs hitting the bot wall on first contact**, with IPv6 worse
still because a whole /64 is scored as one unit. Since 2024, cookies alone are
no longer sufficient for the web client without a PO token.

**[assessment]** There is no flag that fixes this, and it is an arms race, not
a one-time fix — flags that work today can fail in a fortnight. So do not fight
it. **Split the pipeline:**

```
  your laptop (residential IP, browser cookies)      the server
  ─────────────────────────────────────────────      ──────────────────────
  yt-dlp  →  ffmpeg: level, cut, strip metadata  →   short opaque clips only
                                                     never talks to YouTube
```

This falls out of the constraint but is genuinely the better design:

- **Ingest is offline and re-runnable.** No runtime dependency on YouTube, no
  rate limits, no mid-game extraction failures, nothing to break during a game
  night.
- **The server holds only short, metadata-stripped clips.** Smaller, simpler,
  cheaper — and a cleaner posture than a server that hoards a music library.
- **Cookies stay on your machine**, where they belong.

Operationally: pin `yt-dlp` and expect to bump it every few weeks. When ingest
starts failing across the board, **update yt-dlp first** before debugging
anything else.

### 10.4 Vietnamese-specific YouTube pitfalls

**[assessment]** YouTube solves coverage and introduces its own problems, most
of which are sharper for a Vietnamese catalogue:

1. **Long cinematic and dialogue intros.** Vietnamese official MVs frequently
   open with a skit, dialogue, or a cinematic cold open before any music. A
   clip anchored at 0:00 gets you spoken words or ambience — unguessable and
   unfair. ⚠️ `silencedetect` **will not catch this**, because dialogue is not
   silence. Handled two ways in `tools/ingest.py`: an `anchor: "hook"` mode
   that picks a deterministic mid-track point, and a per-song `start_at`
   override. The ingest run prints a **review list** of tracks whose detected
   onset looks suspicious so you can ear-check them.
2. **Hour-long compilations.** `Tuyển tập nhạc trẻ ... 1 tiếng` playlists-as-
   videos are ubiquitous on Vietnamese YouTube and will silently poison a
   catalogue. Rejected by a duration sanity filter (60s–600s), which also
   catches Shorts.
3. **Karaoke, beat, lyric-video and cover reuploads** frequently outrank the
   official audio in search. The mitigation is structural: **never read
   metadata from YouTube.** The seed file carries *your* canonical title,
   artist and aliases, and the video URL is treated as nothing but an audio
   source. This decouples catalogue quality from YouTube's mess, and it is also
   the answer to §5's metadata problem.
4. **Wildly inconsistent loudness.** Uploads vary by many LU. A game where one
   clip is inaudible and the next is blaring is unplayable, and loudness is
   itself a recognition cue you do not want leaking. Fixed with a two-pass
   **EBU R128** `loudnorm` to −14 LUFS.
5. **Cover culture (§3.1.9) is still unresolved** and is now a *sourcing*
   decision too: whichever video you seed *is* the canonical recording for your
   game. Choosing official audio over MVs sidesteps both this and pitfall 1.

### 10.5 Simplifications this scope allows

**[assessment]** Being private and small removes real work — take all of it:

- **No Postgres.** At a few hundred songs, a JSON catalogue plus in-process
  normalisation is entirely sufficient. This **sidesteps §3.2's `unaccent`
  trap** (custom rules for `đ`, no NFD handling) by keeping the logic in
  application code where it is testable. `lib/vietnamese.ts` does this, with a
  test suite.
- **Trivial auth.** A shared passphrase or an invite link is enough, and it is
  also the control that keeps §10.1 true.
- **Anti-cheat can relax.** Colleagues will absolutely open devtools, so keep
  the cheap structural wins — opaque hashed filenames, `-map_metadata -1`, no
  answer in the autocomplete payload before the round resolves — but do not
  degrade audio to defeat Shazam. Among friends, the leaderboard is not worth
  cheating for.
- **Storage is a non-issue.** The seven-step reveal ladder totals ~31.6s of
  audio per song; at 128 kbps AAC that is **~0.5 MB per song**, so a 500-song
  catalogue is **~250 MB**. This fits anywhere, which is why the pipeline
  pre-cuts every step rather than trying to be clever.
- **§4.2's honest trade-off gets easy.** One request per reveal step is the
  only real enforcement, but among friends, client-side enforcement is fine.
  Ship the clip ladder, enforce in the UI, move on.

### 10.6 What still needs doing

- **`ffmpeg` timing verification.** The clip pipeline is **written but not
  executed** — this environment has no `ffmpeg` and YouTube is egress-blocked,
  so it has never processed a real file. The first real run should verify that
  a nominal 0.1s clip *is* ~0.1s, since `-ss` before `-i` is fast but seeks to
  a keyframe. If the short clips come out long or empty, that is the cause, and
  the fix is a decode-accurate seek (`-ss` after `-i`, or `-accurate_seek`).
- **Web Audio playback** per §4.2 — the client side is not written yet.
- **The game loop**, per the build order in §8.

