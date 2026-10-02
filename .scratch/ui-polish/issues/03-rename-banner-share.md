Status: ready-for-agent

# Rename to "Bạn có tài mà", fix social banner and share text

Parent spec: `../spec.md` (items 2 and 3)

## What to build

Visual-only rename of the app to **Bạn có tài mà** (diacritics kept, both languages), exposed from one shared constant plus the i18n messages. Replace the old name and songs-only wording in: page title default/template, application name, Apple web-app title, Open Graph and Twitter titles/descriptions, manifest name and short name, offline page, header wordmark on home and information pages, home intro, install prompt, FAQ and Terms copy/metadata, and in-game share text. Topic pages keep their own Topic-specific headlines.

Fix the social link preview: investigate why it fails (suspects: image and card type only emitted when `SITE_URL` is set at build time, root-relative image URLs, songs-only image and alt text, Topic pages inheriting only app-level metadata). Regenerate a Topic-neutral 1200x630 banner with the new name rendered with correct diacritics. Use absolute URLs from the public origin; define and document a safe fallback when `SITE_URL` is unset. Check the in-game Share button (native share, clipboard fallback, "Copied" feedback) and fix if broken.

Do not rename code identifiers, storage keys (`what-the-song:*`), packages, routes, CSS classes, test ids, CONTEXT.md terms or ADRs.

## Acceptance criteria

- [ ] No player-visible occurrence of "what the song" or songs-only app-level wording remains (metadata, manifest, offline page, FAQ, Terms, header, install prompt, share text)
- [ ] Storage keys, routes and code names unchanged
- [ ] Banner image shows the new name correctly and is referenced by absolute URL when `SITE_URL` is set; documented fallback when not
- [ ] Topic pages produce sensible preview title/description
- [ ] Share button works via native share and clipboard fallback, using the new name
- [ ] Unit tests over exported metadata, manifest and share text (both languages)
- [ ] README/DESIGN.md updated for the name and the `SITE_URL` requirement

## Blocked by

None.
