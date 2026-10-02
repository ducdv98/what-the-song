# Installable web app

The static web export includes `manifest.webmanifest`, three Android icons, an
Apple touch icon, `offline.html`, and a small service worker. The root layout
links the manifest with `crossorigin="use-credentials"` for the optional Caddy
basic-auth gate. Registration runs after page load in production only. The
manifest opens `/songs` in standalone mode; iOS uses the Apple metadata and
Share → Add to Home Screen.

`npm run build --workspace @wts/web` runs `scripts/finalize-pwa.mjs` after
Next's static export. It writes `out/sw-precache.js` with the exported Songs
page, hashed `/_next/static/` files, fonts, offline page, manifest and icons.
The URL list and Songs HTML determine the build version in the shell cache
name. A newly opened app checks for worker updates; an active Round is never
force reloaded. Old shell caches are removed when the replacement activates.
If changing the worker's behavior without changing any exported page or static
file, also change the precache input or version logic so the cache version
changes. The worker and both imported scripts are served with no-cache headers.

The icon source is `apps/web/public/favicon.svg`. To regenerate PNGs from it,
run this from the repo root with the existing `sharp` dependency:

```sh
node --input-type=module <<'JS'
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const svg = readFileSync('apps/web/public/favicon.svg');
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  await sharp(svg).resize(size, size).png().toFile(`apps/web/public/${name}`);
}
const image = await sharp(svg).resize(280, 280).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#f9e549' } })
  .composite([{ input: image, left: 116, top: 116 }])
  .png().toFile('apps/web/public/icon-maskable-512.png');
JS
```

The maskable artwork stays inside Android's safe circle; the rest is theme
colour. If the theme changes, update the manifest, layout viewport, offline
page, and icon background together.

The worker must **never cache API responses, catalogues, clips, covers, Memes,
or external signed asset URLs**. `sw-routing.js` makes only same-origin
navigations, hashed build files and fonts cacheable. Navigation uses the
network first; an offline navigation falls back to its cached page or the
bilingual offline page. Offline play is intentionally unavailable because
Rounds need fresh clues. Caddy's existing `/assets/*` and catalogue caching
rules remain separate from the worker.

Check installability in Chrome DevTools Application → Manifest, preview the
maskable icon, then test Add to Home Screen and offline navigation on a phone.
With `AUTH_USER` and `AUTH_PASSWORD`, check that manifest and worker requests
still authenticate and return `Cache-Control: no-cache, no-store, must-revalidate`.
