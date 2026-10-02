Status: ready-for-agent

# UI polish: Meme popup, social banner, multi-Topic branding, button hover

## Problem Statement

The app now hosts several Topics (Songs, Food, more to come), but four things still feel wrong to the player:

1. The **Meme** sits inside the result card between the stamp and the answer, pushing the answer, score and actions down. It competes with the thing the player actually wants to read.
2. Sharing the app to social media is broken: the link preview ("banner") shown when the site is pasted into a chat or social post is missing or wrong, and it still describes a songs-only game.
3. The app still calls itself "what the song" / "Đoán bài hát" everywhere the player can see (browser title, header wordmark, home page, install prompt, FAQ, Terms, offline page, manifest, share text, social preview), although it is no longer only about songs.
4. Hovering some buttons makes them unreadable: the dark accent buttons (e.g. Guess, accent pills) turn light on hover while their text stays light, so the text vanishes into the background.

## Solution

1. When a Round ends, the **Meme** appears in a dismissable popup (modal dialog) over the result. The result card no longer contains the Meme. Closing the popup reveals the full result card. The popup never blocks play and never affects Score.
2. Pasting the site (or any Topic page) into a chat or social app shows a correct, current banner: a topic-neutral preview image, title and description, with absolute URLs that resolve. The in-game Share button keeps working and uses the new name.
3. The player-facing app name and tagline become Topic-neutral everywhere they are visible. Per-Topic pages keep their own Topic-specific headline (e.g. WHAT THE FOOD?) but the app-level name is the new one. Only visible text and assets change; code identifiers, storage keys, package names, domain terms, and routes are untouched.
4. Every button keeps readable text in every state (rest, hover, focus, active, disabled). Hover changes look like a deliberate state change, never like the button disappearing.

## User Stories

1. As a player who just finished a Round, I want the Meme to pop up over the result, so that it feels like a reaction moment rather than clutter.
2. As a player, I want to dismiss the Meme popup with a close button, so that I can get to my result quickly.
3. As a player, I want to dismiss the Meme popup by pressing Escape, so that I can do it from the keyboard.
4. As a player, I want to dismiss the Meme popup by clicking the backdrop, so that dismissal is effortless on touch and mouse.
5. As a player, I want the result card (answer, Credit, score, history, actions) fully visible after I close the popup, so that I lose no information.
6. As a player on a phone, I want the popup to fit the screen with the Meme scaled to fit, so that nothing is cropped or needs scrolling.
7. As a player, I want the popup to appear only once per finished Round, so that I am not nagged again after closing it.
8. As a player who clicks "Next" or "Try again", I want the popup state reset for the next Round, so that the following Round's Meme shows fresh.
9. As a player who turned Memes off in the menu, I want no popup at all, so that my setting is respected.
10. As a player whose Meme image fails to load (after the existing retry), I want no empty or broken popup, so that the result is not blocked by decoration.
11. As a player using a screen reader, I want the popup announced as a dialog with focus moved into it and returned to the result afterwards, so that it is accessible.
12. As a player with reduced-motion preferences, I want the popup to appear without animation, so that it respects my setting.
13. As a player who wins a Round, I want a "won" Meme, and as a player who loses, a "lost" Meme, so that the reaction matches the outcome (unchanged behaviour).
14. As a player of the Food Topic, I want the same Meme popup as in Songs, so that Topics behave consistently.
15. As a player, I want the "Next" button to remain focusable and the primary action once the popup is closed, so that flow is fast.
16. As someone sharing the site on a social platform, I want a correct banner image, title and description to appear in the link preview, so that the link looks inviting.
17. As someone sharing the site, I want the banner to describe a multi-Topic guessing game rather than just songs, so that it is accurate.
18. As someone sharing a specific Topic page, I want the preview to still make sense (at minimum the app-level banner; Topic-specific title and description if available), so that friends know what they are opening.
19. As a deployer, I want the preview image and metadata to use absolute URLs derived from the configured public origin, so that crawlers can fetch them.
20. As a deployer, I want a clear behaviour when the public origin is not configured (a safe fallback that does not emit broken image URLs), so that a misconfigured build does not ship a broken banner silently.
21. As a player, I want the in-game Share button to copy or share text that uses the new app name, so that what I send matches the app.
22. As a player, I want the Share button to still fall back to the clipboard when native sharing is unavailable, and show "Copied", so that sharing works on desktop.
23. As a player, I want the browser tab title to show the new topic-neutral app name, so that I recognise the app.
24. As a player, I want the header wordmark and home page to show the new name and a Topic-neutral tagline, so that the app feels like it is about guessing, not only songs.
25. As a player installing the app to my home screen, I want the install prompt, manifest name, short name, and Apple web-app title to use the new name, so that the icon label is right.
26. As a player offline, I want the offline page to use the new name, so that branding is consistent.
27. As a reader of the FAQ and Terms pages, I want the descriptive text and titles to use the new name and not claim the app is only about songs, so that they are accurate.
28. As a Vietnamese-speaking player and as an English-speaking player, I want the new name, tagline and copy to be right in both languages, so that both are consistent.
29. As a maintainer, I want the new name defined in as few places as practical, so that renaming again is cheap.
30. As a maintainer, I want code terms (package scopes, storage keys such as `what-the-song:*`, CONTEXT.md vocabulary, route names) untouched, so that no player data or saved prefs is lost.
31. As a player with a dark accent button (Guess, accent pills, Next), I want the text to stay readable on hover, so that I can tell what the button does.
32. As a player, I want hover on light buttons to shift to a clearly different but still readable shade, so that I get feedback.
33. As a keyboard user, I want focus and active states to be equally readable, so that I can navigate confidently.
34. As a player, I want disabled buttons to look disabled without becoming illegible and without any hover effect, so that I know they are unavailable.
35. As a player, I want hover to behave identically for every button class (action buttons, pills, icon buttons, tier chips, Next button, topic cards), so that the UI feels consistent.
36. As a player on a touch device, I want no sticky hover colour after tapping, so that buttons do not stay in a odd state.

## Implementation Decisions

- **Meme popup.** The result card stops rendering the Meme inline. A new dismissable popup component renders it using the app's existing dialog styling (cream card, thick ink border, offset shadow, dimmed backdrop) and the native dialog element behaviour already used elsewhere (sign-in dialog, drawer), including Escape and focus handling.
- The popup is opened when a Round reaches won or lost and a visible Meme exists (reusing the existing "visible result Meme" decision, which already handles disabled Memes and failed images). It opens once per finished Round and is reset when the next Round starts. Dismissal state is local UI state; it is not persisted.
- The popup lives alongside the result card in the result view for both the Songs and Food game screens, so both Topics share one implementation. Image retry and failure handling stay as today; a failed Meme means the popup never opens.
- The Meme remains decoration only: it never affects Score, Streak, stats, or the Meme pool rotation (marking a Meme as shown keeps its current trigger).
- Focus: when the popup closes, focus returns to the result card's primary action. Initial focus inside the popup is on the close button. The result card's existing autofocus on the next-Round button must not fight the popup.
- Motion: any entrance animation is disabled under `prefers-reduced-motion`.
- **Social banner.** Treat "banner" as the link-preview metadata (Open Graph and Twitter card) plus the preview image. Investigate and fix why it fails today; known suspects: the image and card type are only emitted when the public origin is set at build time, image URLs are root-relative, the image itself and its alt text describe songs only, and Topic pages inherit only the app-level metadata. The preview image is regenerated as a Topic-neutral banner at the existing 1200×630 size under the new name. The in-game Share button is also checked and fixed if it is broken (native share first, clipboard fallback, "Copied" feedback).
- Absolute image URLs come from the configured public origin. If it is not configured, the build must degrade predictably (no broken image URL) and the documentation states the requirement.
- **Rename (visual only).** New app name: **Bạn có tài mà** (set by the owner; Topic-neutral; keep it exactly as written, with diacritics, in both languages unless a translation is later supplied). Replace the visible old name and songs-only wording in: page title default and template, application name, Apple web-app title, Open Graph and Twitter titles and descriptions, manifest name and short name, offline page, header wordmark on home and information pages, home page intro, install prompt, FAQ and Terms copy and metadata, share text, and the social banner. Topic-specific copy (Songs and Food pages' own headlines, intros, how-to text) stays Topic-specific.
- Do not rename: package scopes, storage keys, route paths, CSS class names, test ids, repository name, CONTEXT.md terms, ADRs, API names. The manifest `start_url` and `scope` stay as they are unless the home page decision elsewhere says otherwise.
- The new name is exposed from one shared constant where code needs it, with copy flowing through the existing i18n messages for both Vietnamese and English.
- **Button hover.** Root cause to fix: generic hover rules (e.g. on pills and action buttons) have higher selector specificity than the variant rules (accent, guess), so hover swaps the dark variants to a light background while their light text colour is kept. Fix by making each variant own its hover/focus/active/disabled colours explicitly, with background and text always meeting 4.5:1 contrast, and by gating hover styling to devices that actually hover. Audit all button-like classes (action button and its variants, pill and its variants, icon button, tier chip, Next button, play control, topic card) for the same specificity trap.
- Design tokens: any new hover shades are added as named tokens alongside the existing palette rather than hard-coded hex values; DESIGN.md is updated for the popup, the neutral name, and the hover rule.
- No API, schema, contract, or data changes.

## Testing Decisions

- A good test drives the rendered UI the way a player does (render the result, press Escape, click close, click Next) and asserts visible behaviour and accessible roles, not component internals or class names.
- **Primary seam: the result view rendered through the game screens' public components** (Songs and Food), using the existing React Testing Library style tests. Cover: popup opens for a finished Round with a Meme; absent when Memes are off, when no Meme is available, and when the image failed; dismissal by close button, Escape and backdrop; stays closed for the rest of that Round; reappears for the next finished Round; result card no longer contains an inline Meme; Next remains reachable.
- **Secondary seam: app metadata and static assets** as a unit test over the exported metadata and manifest: topic-neutral title, application name, absolute banner URL when the public origin is set, sane fallback when it is not, old songs-only name absent from player-visible metadata, manifest and offline page. Share text asserted via the existing share-text helper and i18n messages in both languages.
- **Hover/contrast: a CSS-level check** that parses the stylesheet and asserts, for every button-like class and state, that text and background tokens resolve to at least 4.5:1 contrast and that no hover rule leaves a variant with its own text colour on a conflicting background. If parsing the cascade is impractical, a browser-level check of computed styles on hover for the dark variants is acceptable.
- Prior art: existing component tests such as the Food zoom and home page tests, the meme library tests, the PWA tests, and the i18n message tests in the web app.
- Manual verification via the running app: dismiss the popup on phone and desktop widths, paste a Topic URL into a link-preview debugger on a deployed origin, hover each button style.

## Out of Scope

- Changing which Meme is picked, the Meme pool, ingestion, or the Memes setting itself.
- Renaming code identifiers, storage keys, packages, routes, repository, or domain vocabulary.
- Per-Topic generated banner images (one neutral banner is enough) and dynamic Open Graph image generation.
- New Topics, new Stages, Score changes, or API changes.
- A full visual redesign beyond the hover and popup fixes.
- Search-engine indexing: the site stays non-indexed.

## Further Notes

- "Banner share to social" was interpreted as the link-preview banner; the in-game Share button is checked as part of the same item. If the owner meant something else, only item 2 needs revisiting.
- The app name "Bạn có tài mà" was specified by the owner. It is isolated in one shared constant so a future rename stays cheap. The social banner image must render the name with correct Vietnamese diacritics (Anton and Be Vietnam Pro both support them).
- Suggested ticket split: (1) button hover/contrast fix, (2) Meme popup, (3) rename plus metadata plus banner image and share text. They are independent.
