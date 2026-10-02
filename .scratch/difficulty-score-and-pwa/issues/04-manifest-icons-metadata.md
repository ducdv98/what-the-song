# Web app manifest, icons and metadata

Status: done
Blocked by: none

See `spec.md` (PWA: Web app manifest, Metadata).

Make the app installable on a phone.

Add a static manifest (name "what the song", short name, standalone, theme and background from the yellow theme, start_url and scope on the Songs Topic, Vietnamese). Generate from the existing favicon and commit: 192 and 512 icons, a 512 maskable icon, and a 180 Apple touch icon. Link them from the root layout with the Apple web-app settings. Keep the theme colour and noindex robots. The site must still build as a static export.

## Done when
- A check (script or test) validates the manifest JSON and that every referenced icon exists.
- Chrome DevTools shows the manifest with no errors and maskable icon preview is correct (manual).
- Production build still exports static files.
