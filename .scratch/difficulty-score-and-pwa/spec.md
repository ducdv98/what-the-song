# Difficulty-weighted Score and an installable app (PWA)

Status: ready-for-agent
Vocabulary: `CONTEXT.md` (Score, Tier, Stage, Round, Leaderboard, Streak).

## Problem Statement

1. Score ignores how hard the Subject was. Winning an easy Song on the first Stage pays the same 1000 points as winning an impossible one, so a player can climb the Leaderboard by only playing the easy Tier. The Tier a player picks has no stake.
2. The game is a website. To play, a friend has to open a browser and find the URL or a bookmark. On a phone there is no icon on the home screen, so it is not quick to reach and does not feel like an app.

## Solution

1. Score is the Stage-based Score as today, scaled by a multiplier that depends on the Subject's Tier. Lower Tier, lower Score: an easy win is worth clearly less than an impossible win at the same Stage. The player sees the scaled points before they guess, on the result, in the share text and on the Leaderboard.
2. The game can be installed to a phone's home screen (and desktop) from the browser. It opens full screen with its own icon, name and theme colour, and starts on the Songs Topic. Offline, the player gets a friendly "you need a connection to play" page instead of the browser's error. Updates reach installed copies without reinstalling.

## User Stories

1. As a player, I want an easy Subject to score less than a hard one at the same Stage, so that picking a harder Tier is rewarded.
2. As a player, I want an impossible-Tier win on the first Stage to be the best Score in the game, so that there is still a top prize to aim for.
3. As a player, I want a Subject with no Tier to score as medium, so that untagged Subjects are not special.
4. As a player, I want the points shown next to the Guess button to already include the Tier multiplier, so that what I see is what I get if I win now.
5. As a player, I want the "skip costs" hint to show the scaled points left after skipping, so that the trade-off is honest.
6. As a player, I want the result card to show the scaled Score, so that it matches what went on my total.
7. As a player, I want the share text to show the scaled Score, so that friends see the real number.
8. As a player, I want Score to still fall as I use more Stages, so that guessing earlier still counts for more within any Tier.
9. As a player, I want a loss to still be 0 points at any Tier, so that nothing else about losing changes.
10. As a player, I want my Streak unaffected by the change, so that Streak keeps meaning consecutive won Rounds.
11. As a player on the Leaderboard, I want ranks to be computed from the scaled Scores, so that ranking reflects difficulty.
12. As a player with a history, I want my old Rounds left as they were recorded, so that my totals do not jump around or get rewritten.
13. As a guest, I want guest stats in my tab to use the same scaled Score, so that signing up later does not feel different.
14. As a player, I want the FAQ to explain that harder Tiers score more, with the multipliers, in Vietnamese and English, so that I understand the rules.
15. As a player, I want the Tier chips or the round header to hint that the Tier affects points, so that I notice before I choose.
16. As a maintainer, I want the multipliers in one place in the shared game package, so that web, API and tests cannot drift apart.
17. As a maintainer, I want the API to reject a reported win whose Score is impossible for its Tier, so that the existing sanity check still means something with the new scale.
18. As a maintainer, I want older clients that still report unscaled Scores to be handled predictably, so that a cached old page does not break recording.
19. As a player on my phone, I want to add the game to my home screen, so that I can open it in one tap.
20. As a player, I want the installed app to open full screen without browser chrome, so that it feels like an app.
21. As a player, I want a recognisable icon and the name "what the song" on my home screen, so that I can find it.
22. As an Android player, I want a proper adaptive (maskable) icon, so that the icon is not shrunk inside a white square.
23. As an iPhone player, I want the Add to Home Screen icon, title and status bar to look right, so that Safari installs look as good as Android ones.
24. As a player, I want the installed app to open on the Songs Topic, so that I am playing immediately.
25. As a player, I want the status bar and splash colours to match the yellow theme, so that launch looks intentional.
26. As a player, I want a hint about how to install when my browser supports it and I have not installed yet, and I want to dismiss it for good, so that I know the option exists without being nagged.
27. As a player, I do not want an install hint once the app is installed or running standalone, so that it does not nag.
28. As a player who opens the installed app with no connection, I want a clear offline page in my language, so that I understand why it does not work.
29. As a player, I want the app shell to load fast on repeat visits, so that launching from the home screen is quick.
30. As a player, I want clips, covers, memes and catalogues to always come fresh from the network under the existing rules, so that new Subjects appear and private signed URLs never go stale.
31. As a player, I want account, stats and Leaderboard requests never served from a cache, so that my results are always current.
32. As a player, I want a new version of the app to take over when I reopen it, so that I am not stuck on an old build or an old scoring table.
33. As a player, I want sign-in to keep working inside the installed app, so that my saved stats and Streak follow me.
34. As the owner, I want the service worker and manifest to work behind the optional basic-auth gate, so that a private deployment can still be installed.
35. As the owner, I want the service worker file never cached long-term, so that a fix to it always ships.
36. As the owner, I want search engines still told to stay away, so that the private game stays private.
37. As a maintainer, I want the app to keep building as plain static files, so that deployment is still "copy a folder".
38. As a maintainer, I want the PWA pieces documented, so that the next person knows how to change the icon, name or caching.

## Implementation Decisions

### Scoring

- **Tier multiplier.** Score for a won Round = Stage-based Score (unchanged geometric decay from 1000 on the first Stage to 50 on the last) × the Subject's Tier multiplier, rounded to a whole number. First-pass multipliers, tunable in one place: easy 0.4, medium 0.6, hard 0.8, expert 0.9, impossible 1.0. A Subject with no Tier uses medium. Impossible keeps 1000 as the highest possible Score, so the "best Score" ceiling stays meaningful.
- **Shared game package owns the rule.** The pure scoring function in the core package gains the Tier as an input and applies the multiplier; the multiplier table sits beside the Tier definitions. The Round state machine and the "points available if you win now" displays read the same function. The Round's Score is computed from its Subject's Tier.
- **Constants.** Keep a global ceiling (1000) and expose a per-Tier floor and ceiling helper for validation. The old global floor of 50 is no longer a floor for lower Tiers (easy last Stage is 20).
- **API validation.** A reported win must have a Score within the floor and ceiling for the reported Tier (`difficulty`). A loss must still be 0. The record contract and stored Round shape do not change: Score and difficulty already travel together. No migration.
- **History is not rewritten.** Stored Rounds and totals keep their original Scores. Weekly and monthly Leaderboards spanning the release day mix old and new Scores. Accepted among friends.
- **Old clients.** A cached old page may report an unscaled Score (e.g. 1000 for an easy Subject). Decision: the server clamps such a win down to the Tier ceiling rather than rejecting it, so recording never fails and cannot inflate.
- **Guest stats** use the same Round Score, so they need no separate change.
- **UI copy.** The FAQ score answer (Vietnamese and English) states the multipliers. A short Tier-affects-points hint is added where the Tier is chosen. Messages stay in the existing i18n catalogue, both languages.
- **Share text and Leaderboard** show whatever Score the Round holds; no format change.

### PWA

- **Web app manifest.** Name "what the song", a short name for the home screen, `display: standalone`, theme and background colour from the existing yellow theme, `start_url` and scope on the Songs Topic, language Vietnamese. Icons: 192 and 512 (any), a 512 maskable, and an Apple touch icon (180). Icons are generated once from the existing favicon artwork and committed as static files; no build-time tooling.
- **Metadata.** Link the manifest and Apple touch icon from the root layout; add the Apple web-app-capable and status-bar settings; keep the existing theme colour and the noindex robots setting.
- **Service worker.** A hand-written, minimal worker served from the site root so its scope covers the whole app. No new runtime dependency. Strategy:
  - Precache the app shell: the exported Topic page, static JS/CSS bundles and fonts, the manifest, icons and an offline page.
  - Navigations: network first, then the cached shell, then the offline page.
  - Hashed static build assets and fonts: cache first.
  - Never intercept: `/api/*` (accounts, stats, Leaderboard, asset signing), clip/cover/meme asset URLs and every catalogue. These go to the network exactly as today, including signed COS URLs and the no-store catalogue rule.
  - Versioning: the cache name carries a build version; on activation old caches are deleted. A new worker takes over when the app is next opened (no forced mid-Round reload).
- **Registration.** After page load, production builds only, so development and the dev proxy are unaffected. Registration failure is silent.
- **Offline page.** A static bilingual page (Vietnamese first, English second) saying a connection is needed to play. No Round runs offline because clips need the network; explicit and accepted.
- **Install hint.** A small dismissible prompt using the browser's install-prompt event where supported; on iOS Safari a one-line "Share → Add to Home Screen" instruction. Hidden when already standalone or after dismissal; dismissal is remembered with the other remembered choices in local storage. Never blocks play.
- **Server headers (Caddy).** The service worker file and the manifest are served with no long-term cache, the worker with a JavaScript type; both sit behind the same optional basic-auth gate as everything else, and the manifest link uses credentials so installs work when the gate is on. Everything else keeps the existing caching rules.
- **Static export preserved.** The web app still builds to plain files; no Next.js server features are introduced.
- **Auth in the installed app.** Cookies are same-origin and unchanged, so sign-in works in standalone mode with no API change.
- **Docs.** A short note: how the PWA is wired, how to regenerate icons, how to bump the cache version, and the "never cache API/assets" rule.

## Testing Decisions

- **Seams.** (1) The core package's public scoring API (Round plus the Tier-aware score function), in the existing node:test style; the highest seam for scoring, consumed by both web and API. (2) The API's round-recording path, through the existing service spec and e2e harness, for validation and the old-client clamp. (3) For the PWA, one pure function in the worker that classifies a request (network-only vs cacheable), plus a check that the built manifest and icons are valid and referenced. Browser installability is verified manually and with Lighthouse/DevTools, not in CI.
- **What a good test is.** Assert external behaviour: a Subject of Tier T won on Stage N of M yields Score X; a reported win with Tier T and Score S is accepted, clamped or rejected; the worker leaves `/api`, asset and catalogue URLs alone. Never assert on internal tables or cache names.
- **Scoring cases.** Every Tier on the first and last Stage; ladders of 1, 3, 5 and 7 Stages; untagged Subject = medium; Score non-increasing by Stage within a Tier; at the same Stage Score strictly increases with Tier; a loss is 0; impossible first Stage = 1000.
- **API cases.** Win in range for its Tier is stored as reported; win above the Tier ceiling is clamped, not rejected; win below the Tier floor is rejected; loss with non-zero Score is rejected; unknown Tier is still rejected by existing validation.
- **Prior art.** `round.test.ts` in the core package (scoring by position for several ladder lengths, monotone decay), the stats service spec and e2e spec in the API app, and the i18n and storage tests in the web app.

## Out of Scope

- Rescoring or migrating existing Rounds, Leaderboard history or totals.
- Per-Topic or per-Subject multipliers; the multiplier depends only on the Tier.
- Changing Stage decay, Tier definitions, Match rules or Streak rules.
- Real offline play, caching clips or catalogues, background sync.
- Push notifications, badges, app-store packaging, share-target or manifest shortcuts.
- UI redesign beyond the hint and the install prompt.
- A new icon design; the existing favicon artwork is the source.

## Further Notes

- Multipliers are a first pass; tuning later is a one-line change plus FAQ copy and test expectations.
- Because the ceiling stays 1000, the API's current upper bound and DTO range check stay valid; only the lower bound becomes Tier-aware.
- The Leaderboard will favour hard-Tier play from release day onward; consider telling the group.
- iOS only offers install via Safari's Share menu (no install event), hence the separate instruction. iOS may evict service-worker caches after non-use; the app must work with an empty cache.

## Tickets

01 tier-multiplier-in-core, 02 api-validation-and-old-client-clamp, 03 score-copy-and-hints, 04 manifest-icons-metadata, 05 service-worker-and-offline-page, 06 install-hint, 07 caddy-headers-and-docs
