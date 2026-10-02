# Service worker and offline page

Status: done
Blocked by: 04

See `spec.md` (PWA: Service worker, Registration, Offline page).

Add a minimal hand-written service worker at the site root, no new dependency.

Precache the app shell, offline page, manifest and icons. Navigations: network first, then cached shell, then offline page. Hashed static assets and fonts: cache first. Never intercept `/api/*`, clip/cover/meme asset URLs or any catalogue. Cache name carries a build version; old caches are deleted on activate; a new worker takes over on next open. Register after load in production builds only; failure is silent. Add a static bilingual offline page.

## Done when
- The request-classification decision is a pure function with unit tests: API, assets and catalogues are network-only; static build assets are cacheable; navigations fall back as specified.
- Offline, the installed app shows the offline page; online behaviour (fresh catalogues, signed URLs, stats) is unchanged (manual).
- No registration in development.
