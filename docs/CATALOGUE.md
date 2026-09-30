# Adding songs to the catalogue

Instructions for growing `seed.jsonl`. Written to be handed to an agent, but a
person adding songs by hand should follow the same rules.

**Goal: 1000+ songs.** Quality bar matters more than speed — one wrong genre tag
is invisible, but a thousand inconsistent ones make the genre picker useless and
there is no cheap way to re-audit them later.

---

## 1. The row format

One JSON object per line. Blank lines and `//` comments are ignored.

```json
{"id":"nnca","title":"Nơi Này Có Anh","artist":"Sơn Tùng M-TP","url":"https://www.youtube.com/watch?v=...","genre":"nhac-tre","tier":"easy"}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Short, unique, `[a-z0-9-]`. Derive from the title; add a suffix on collision. Once used it must never change — it is the clip directory name. |
| `title` | yes | The canonical Vietnamese title **with full diacritics**, in Title Case. No `(Official MV)`, no feat. list, no remix marker. |
| `artist` | yes | The performer most associated with the recording, with diacritics. |
| `url` | yes | A YouTube URL for the audio. See §4. |
| `genre` | yes | Exactly one slug from §2. |
| `tier` | strongly advised | How well known the song is — the difficulty it plays under. See §5.1. Untagged plays as `medium`. |
| `aliases` | no | Other accepted answers: a widely used English title, a very common alternative spelling. Not misspellings — the matcher already handles diacritics and typos. |
| `anchor` | no | `hook` (default), `intro`, or `body`. Leave it out unless you know better. |
| `start_at` | no | Exact clue offset in seconds. Only after listening. |
| `ladder` | no | Custom reveal steps. Leave it out. |

Never invent a `url`. If you cannot find the song on YouTube, skip it and move
on — a broken URL costs a failed ingest run and a confusing report.

---

## 2. The genres

Twenty slugs. **Exactly one per song.**

### Contemporary
| Slug | Name | Covers |
|---|---|---|
| `nhac-tre` | Nhạc trẻ | Modern Vietnamese pop. The default for post-1990 mainstream songs with no stronger fit. |
| `ballad` | Ballad | Slow, emotive, voice-forward. Use when the song is known as a ballad rather than a pop single. |
| `rap-viet` | Rap Việt | Rap and hip-hop. Rapped delivery dominates. |
| `indie` | Indie | Indie, bedroom pop, alternative. Independent production, non-mainstream sound. |
| `rock-viet` | Rock Việt | Rock in all its forms. |
| `rnb-soul` | R&B / Soul | R&B and soul. |
| `dance-edm` | Dance / EDM | Dance, house, electronic, club. |
| `acoustic` | Acoustic | Acoustic and unplugged as the song's primary identity. |

### Era and movement
| Slug | Name | Covers |
|---|---|---|
| `bolero` | Bolero | The bolero rhythm and song form, **especially modern recordings and new compositions**. |
| `nhac-vang` | Nhạc vàng | The pre-1975 Southern popular/romantic repertoire, as originally composed. |
| `tien-chien` | Nhạc tiền chiến | Romantic tân nhạc from roughly the late 1930s to 1954. |
| `nhac-do` | Nhạc đỏ | Revolutionary and patriotic songs written for the cause. |
| `hai-ngoai` | Nhạc hải ngoại | Post-1975 diaspora production — Thúy Nga, Asia, Vân Sơn, Làng Văn and similar. |
| `nhac-trinh` | Nhạc Trịnh | Songs composed by Trịnh Công Sơn. An auteur category, not a style. |

### Traditional
| Slug | Name | Covers |
|---|---|---|
| `dan-ca` | Dân ca | Folk song, including quan họ, ví giặm, hò and regional folk. |
| `cai-luong` | Cải lương | Reformed opera, vọng cổ, đờn ca tài tử. |
| `co-truyen` | Nhạc cổ truyền | The rarer classical and ceremonial forms pooled together: ca trù, chèo, chầu văn, hát xẩm, hát xoan, nhã nhạc, ca Huế, bài chòi, tuồng. |

### Provenance
| Slug | Name | Covers |
|---|---|---|
| `nhac-phim` | Nhạc phim | Soundtrack, **only** when the song has no clearer musical identity (§3 rule 9). |
| `thieu-nhi` | Nhạc thiếu nhi | Children's songs. |
| `khac` | Khác | Genuinely none of the above. Use sparingly — a large `khac` means the taxonomy needs revisiting, not that you found twenty exceptions. |

---

## 3. Choosing a genre: apply in order, stop at the first match

Several genres overlap by design. **Work down this list and take the first rule
that fires.** Do not pick "the best-sounding label" — consistency across a
thousand rows matters more than any single judgement call.

1. **A traditional form?** → `dan-ca`, `cai-luong`, or `co-truyen`.
2. **Composed by Trịnh Công Sơn?** → `nhac-trinh`. This wins over everything
   below, including a modern pop cover of his work.
3. **Written for children?** → `thieu-nhi`.
4. **Revolutionary or patriotic, written for the cause?** → `nhac-do`.
5. **Romantic tân nhạc from before 1954?** → `tien-chien`.
6. **Pre-1975 Southern popular/romantic repertoire?** → `nhac-vang`.
7. **Produced in the diaspora after 1975** (Thúy Nga, Asia, Vân Sơn…)? →
   `hai-ngoai`.
8. **Bolero rhythm, and rules 5–7 did not fire?** → `bolero`. In practice this
   means modern bolero: new compositions and contemporary recordings.
9. **Known primarily as a film or TV soundtrack, with no clear style of its
   own?** → `nhac-phim`. A pop single that happens to appear in a film is
   `nhac-tre`, not `nhac-phim`.
10. **Otherwise pick by musical style:** `rap-viet`, `rock-viet`, `dance-edm`,
    `rnb-soul`, `indie`, `acoustic`, `ballad` — whichever the song is actually
    known as.
11. **Still nothing?** → `nhac-tre` if it is modern mainstream, else `khac`.

### The overlaps that cause most mistakes

- **`bolero` vs `nhac-vang`.** These are used almost interchangeably in
  conversation, which is exactly why a rule is needed. *Era decides:* the
  pre-1975 Southern original is `nhac-vang`; a modern bolero recording or a new
  bolero composition is `bolero`. A 2018 cover of a 1960s song is still
  `nhac-vang` — the song's identity, not the recording's date.
- **`nhac-tre` vs `ballad`.** `ballad` only when the song is genuinely known as
  a ballad. When in doubt, `nhac-tre`.
- **`nhac-trinh` vs everything.** Trịnh Công Sơn's songbook is its own category
  in Vietnamese catalogues and in listeners' heads. Rule 2 is absolute.
- **`indie` vs `nhac-tre`.** Independent production and a non-mainstream sound,
  not merely "a less famous artist".
- **`dan-ca` vs `co-truyen`.** Folk song people sing → `dan-ca`. Staged or
  ceremonial classical forms → `co-truyen`.

---

## 4. Choosing the YouTube URL

The video is **only an audio source**. Its title is never read — the catalogue's
metadata is whatever this file says.

**Prefer, in order:**
1. The artist's or label's **official audio** upload (often an auto-generated
   "Topic" channel). Best choice: no cinematic intro, clean audio.
2. The **official MV**. Acceptable, but these frequently open with dialogue or a
   skit — see `docs/RESEARCH.md` §11.
3. A high-quality full upload of the original recording.

**Never use:**
- Karaoke, beat, or instrumental versions — there is no vocal to recognise.
- Covers or remixes, unless that specific recording is the famous one.
- Hour-long compilations (`Tuyển tập…`, `Liên khúc…`). Ingest rejects anything
  outside 60–600s, but do not waste the run.
- Live versions, unless the live recording is the definitive one.
- Lyric-video reuploads by third parties, which are often poor quality.

---

## 5. Which songs to add

This is a guessing game, so the bar is **recognisable**, not merely *real*.

**Add:** songs a Vietnamese listener would plausibly name after a few seconds —
hits, standards, karaoke staples, songs that charted or went viral, the
best-known work of well-known artists.

**Skip:** album tracks nobody names, songs by artists with no public profile,
anything you cannot verify exists with that title and artist.

**Spread the eras.** A library of only 2020s hits is dull and unfair to older
players. Aim for a real mix across decades within the contemporary genres.

### 5.1 Choosing a tier

The difficulty chips pick songs by tier, so the tier is a judgement of **how
many Vietnamese listeners would name the song**, not of how hard the clip is.
Ask: *who knows this?*

| Tier | Who can name it | Typical examples |
|---|---|---|
| `easy` | Almost everyone, including people who don't follow music | Nationwide #1 hits, wedding and karaoke staples |
| `medium` | Anyone who listens to this genre or era | Charting hits, an artist's second-best-known song |
| `hard` | Regular listeners of the artist or genre | Solid album tracks, older hits that have faded |
| `expert` | Real fans of the artist or era | B-sides, early work, regional hits |
| `impossible` | A handful of devotees | Deep cuts — keep these rare |

Aim for a pyramid, roughly 30% easy, 30% medium, 20% hard, 15% expert, 5%
impossible. When unsure between two tiers, pick the easier one: a song that is
too easy is a quick win, one that is too obscure is a round nobody enjoys.

### Distribution target for 1000 songs

A guide, not a quota — adjust to what is actually findable.

| Genre | Target | | Genre | Target |
|---|---|---|---|---|
| `nhac-tre` | 220 | | `nhac-trinh` | 40 |
| `ballad` | 110 | | `tien-chien` | 35 |
| `rap-viet` | 90 | | `hai-ngoai` | 35 |
| `nhac-vang` | 90 | | `rock-viet` | 30 |
| `bolero` | 70 | | `dance-edm` | 30 |
| `indie` | 60 | | `rnb-soul` | 25 |
| `nhac-do` | 50 | | `acoustic` | 20 |
| `dan-ca` | 40 | | `cai-luong` | 20 |
| `nhac-phim` | 40 | | `thieu-nhi` | 20 |
| | | | `co-truyen` | 15 |

---

## 6. Workflow

Work in **batches of 25–50**, not one enormous append. A batch is small enough
to review and to undo.

1. Pick a genre and an era to fill, from §5 and the current distribution.
2. Research songs that meet the §5 bar.
3. Find a URL for each, per §4.
4. Assign a genre with the §3 procedure.
5. Append the rows to `seed.jsonl`.
6. **Validate before moving on:**

   ```sh
   python tools/validate_seed.py seed.jsonl
   ```

   Fix everything it reports. It checks required fields, id uniqueness,
   duplicate title+artist pairs, unknown genres and tiers, suspicious titles,
   URL shape, and prints the genre distribution against the §5 targets and the
   count per tier.
7. Only then ingest:

   ```sh
   ./tools/ingest.py seed.jsonl
   ```

   Ingest skips songs already built, so re-running is cheap.

### Rules for an agent doing this unattended

- **Never delete an existing row, and never change its `id` or `url`.** `id`s
  are clip directory names. Editing `tier`, `title`, `aliases` or `genre` on an
  existing row is safe — ingest re-applies them without rebuilding the audio.
- **Never invent a URL.** Skip the song instead.
- **Never guess a title's diacritics.** If you cannot verify the correct
  spelling, skip the song — a wrong title is an unwinnable round.
- **Stop and report** if validation fails twice on the same batch.
- **Report** the count added, the genre spread, and anything skipped and why.
