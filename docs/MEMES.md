# Adding memes to the pool

Instructions for growing the result **Meme** pool. Written to be handed to an
agent, but a person adding memes by hand should follow the same rules. The
sibling of `docs/CATALOGUE.md` (songs).

A Meme is a still image shown on the result card when a Round ends, chosen by
outcome (`won` or `lost`). It is decoration: never a Clue, never affects Score
(`CONTEXT.md`, `.scratch/memes/spec.md`). One global pool serves every Topic.

**Goal: about 20 `won` and 20 `lost` memes to start.** Fewer than 4 per outcome
repeats too quickly, because the picker only avoids showing the same image twice
in a row. Quality and fit matter more than count: a bad or off-tone image is
hard to un-see once players have met it.

---

## 1. The manifest row

A source folder holds the images plus one `manifest.json`: a JSON array of
objects.

```json
[
  {"file": "cat-dance.webp", "outcome": "won", "source": "Own photo, 2026"},
  {"file": "sad-pigeon.jpg", "outcome": "lost", "source": "https://commons.wikimedia.org/wiki/File:Example.jpg (CC BY 4.0, Jane Doe)"}
]
```

| Field | Required | Notes |
|---|---|---|
| `file` | yes | A filename in the same folder, ending `.webp`, `.jpg` or `.png`. No subfolders, no slashes. Ingest renames it to `<sha256-24>.<ext>`, so the local name is only for you. |
| `outcome` | yes | Exactly `won` or `lost`. |
| `source` | yes | Non-empty provenance string. See §3. Never shown to players. |

Ingest rejects the whole manifest if any row is invalid or its file is missing.
Two rows pointing at identical bytes collapse to one hashed file.

---

## 2. The image

| Property | Rule |
|---|---|
| Format | Still `.webp` (preferred), `.jpg` or `.png`. **No GIF, no animated WebP/APNG**: the spec is still-only. |
| Size on screen | Drawn at most 320 × 180 CSS px (150 px tall on phones), scaled to fit with `object-fit: contain`. Nothing is cropped, so any aspect ratio works; wide 16:9 uses the space best. |
| Pixel size | About **640 px wide** (2× for retina). Longest side no more than 800 px. Smaller is fine, larger wastes bandwidth. |
| File size | Aim for under 100 KB, hard limit 200 KB. Re-encode before adding. |
| Text | Any text must be **baked into the image**. There is no caption field and no i18n, and the alt text is empty. It must stay readable at 320 px wide. |
| Language | Vietnamese text with full, correct diacritics, or no text. English is acceptable only if a Vietnamese player gets it instantly. Never guess a diacritic: drop the image instead. |
| Background | The result card is a light poster surface. Avoid pure white borders that look like a hole; a transparent PNG/WebP is fine. |

Resize and re-encode before adding (`ffmpeg` is installed; Pillow is not):

```sh
ffmpeg -i in.png -vf "scale='min(640,iw)':-2" -c:v libwebp -quality 80 -frames:v 1 out.webp
```

Check the result is a single frame and under the size limit.

---

## 3. Choosing memes

### 3.1 What fits each outcome

The image appears under a stamp that already says "Đúng rồi" or "Chưa đoán ra".
It should land the feeling of that moment, not explain it.

| Outcome | Feeling | Examples |
|---|---|---|
| `won` | Smug, delighted, victory dance, "easy" | A dancing animal, a triumphant pose, a "ez" reaction |
| `lost` | Playful defeat, confusion, "so close" | A confused or crying animal, a facepalm, an "oops" |

The loss meme must be **gentle**. The player just lost a round; mocking *them*
is wrong, a sympathetic shrug is right.

### 3.2 Content rules

Skip an image if any of these apply:

- It mocks, insults or targets a real, identifiable private person.
- Sexual, hateful, violent, political or religious content.
- Alcohol, drugs, gambling or self-harm presented as a joke.
- A music artist's or song's identity: it would hint or spoil a Round. Keep it
  generic.
- A brand logo or watermark prominent enough to read as an advert.
- Content that depends on a joke you cannot verify a Vietnamese player would get.
- Offensive in Vietnamese even if harmless in English. When unsure, skip it.

Tone follows `docs/VOICE-STYLE-GUIDE.md`: restrained, not slang-heavy, no
cheerleader energy. Memes are the one place personality is allowed, but one
good image beats ten noisy ones.

### 3.3 Provenance, the `source` field

The owner has decided that **licence and credit do not matter**: widely shared,
public memes are fine, and no attribution is needed. Nothing in the pipeline
checks rights, so do not spend time on licence research either.

`source` is still required and must be **true**: the page URL where you found
the image (or a short note such as `Owner's photo`). It exists so a meme can be
traced and removed later, not as a gate.

Good places to look: Wikimedia Commons, Know Your Meme, Reddit and Imgur
meme threads, Giphy/Tenor (only a still frame, see §2), and general image
search for a named reaction meme. Prefer the highest-resolution original over a
screenshot of a screenshot.

Skip an image only for the §3.2 content rules or the quality bar in §2, for
example heavy compression artefacts, a watermark covering the joke, or
unreadable text.

**Never invent a `source`.** If you cannot say where an image came from, record
what you can (`Found via image search for "<query>"`) rather than a made-up URL.

---

## 4. Workflow

Work in **batches of 5–10 images**, then stop for review.

**There is one cumulative source folder, `memes-source/`, and its
`manifest.json` is the master.** Each publish rebuilds `memes/catalogue.json`
from exactly the manifest you pass, so a manifest holding only the new batch
would drop every earlier meme from the live pool. Add new rows and files to the
same folder; never start a fresh one.

1. Create `memes-source/` if absent (it is in `.gitignore`, outside the tracked
   tree). If it is absent but memes are already live, stop and ask the owner for
   the existing manifest instead of starting over.
2. Find and download candidates per §3. Save each file locally; never hot-link.
3. Re-encode to §2 limits and put them in the folder.
4. **Append** one row per image to `manifest.json`.
5. **Look at every image** (open it) before listing it. A downloaded file is
   not the same as the one you thought you found.
6. **Validate** before moving on. This needs no credentials: it checks the
   whole manifest (fields, outcomes, files present) and builds the hashed
   library in a throwaway temp directory:

   ```sh
   python3 -c "import sys,tempfile,pathlib; sys.path.insert(0,'tools'); import ingest; print(ingest.build_meme_library(pathlib.Path('memes-source'), pathlib.Path(tempfile.mkdtemp())/'memes'))"
   ```

   It prints a `catalogue.json` path on success, or a `ValueError` /
   `FileNotFoundError` naming the bad row. Fix everything it reports. Also
   confirm each file decodes as one frame:
   `ffprobe -v error -count_frames -show_entries stream=width,height,nb_read_frames -of csv memes-source/<file>`.
7. **Stop and hand the folder to the owner.** Both COS commands need the
   uploader credentials (`COS_BUCKET`, `COS_REGION`, `COS_UPLOAD_SECRET_ID`,
   `COS_UPLOAD_SECRET_KEY`), which an agent normally does not have. The owner
   runs the dry run, then the real publish to the production bucket:

   ```sh
   ./tools/ingest.py --publish --memes memes-source --dry-run
   ./tools/ingest.py --publish --memes memes-source
   ```

   It mirrors the images into `apps/web/public/assets/memes/` (local
   development), uploads only keys COS lacks, verifies, and publishes
   `memes/catalogue.json` last. Repeating it skips what exists.

Publishing never overwrites a key. To retire a meme, remove its row from the
manifest and run with `--prune --dry-run` first, then `--prune`.

Check it worked in the browser: finish a Round and see an image under the stamp.
The pool is fetched once and cached per page load, so reload after publishing.

### Rules for an agent doing this unattended

- **Never invent a `source` URL.**
- **Never publish** (non-dry-run) or run `--prune` without the owner's go-ahead.
- **Never commit images.** `apps/web/public/assets/` and `memes-source/` stay
  out of git.
- **Never remove or edit** an existing manifest row or image; only append.
- **Stop and report** if validation fails twice on the same batch.
- **Report** per batch: images added per outcome, each `source`, and anything
  skipped and why (off-tone, unreadable text, low quality).

---

## 5. Why a meme may not appear

The feature fails silently by design (`spec.md` decision 10). If no meme shows,
check in this order:

1. The Memes toggle in the menu is on (default on).
2. `memes/catalogue.json` exists in the bucket (or in
   `apps/web/public/assets/memes/` with no `COS_*` set). A 404 means nothing was
   ever published.
3. The catalogue has at least one entry for the outcome just played.
4. The image key exists: ingest verifies this before publishing the catalogue.
5. The browser can reach the signed COS URL (bucket CORS rule allows the site).
