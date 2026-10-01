# What the Song — Gig Poster design system

**Status:** Implemented September 2026. The frontend now uses the Gig Poster palette, self-hosted Anton and Be Vietnam Pro fonts, responsive printed play and result cards, real audio progress, accessible stage history, and coordinated drawer and account styles. Desktop introduces the game with a bilingual poster headline; phones put the controls first. The guest notice sits below the game, with expandable details.

**Reference:** [interactive raw HTML preview](design-previews.html), style 02. The preview is a visual sketch. The rules, copy, and component behavior in this document take precedence where the sketch simplifies the real game.

## 1. Product fit and concept

What the Song is a private, bilingual guessing game for Vietnamese music. Players hear a short clip, reveal longer clips at a score cost, type the song title, and see a result. Difficulty, genre, streaks, account, and leaderboards support that loop. The app is a single screen, often used on a phone, and has no public music library to browse.

**Concept: a Vietnamese gig poster brought to life.** The page feels like an energetic show flyer: a bright yellow field, oversized ink typography, a printed cream play card, coral accents, heavy offset shadows, and stage markers that look like tickets or setlist strips. This should feel social and immediate, with the music clue as the star.

### Design goals

1. The player sees the current clue, play button, and answer action at a glance.
2. The visual rhythm builds as clues get longer, without suggesting a countdown or fake audio waveform.
3. The app has its own identity. The selected style is a poster language, not a copy of a streaming service or a real artist's promotional materials.
4. Song identity stays hidden until the result. No pre-answer cover art, title, artist, or answer derived colors.
5. Vietnamese and English both fit, with tone marks rendered cleanly and natural sentence case for functional text.
6. A phone player can use every primary action with one hand, with keyboard and screen reader support preserved.

### Current product constraints

The game already has a variable, per-song clip ladder, up to five stages. The default ladder is 0.1, 0.5, 2, 8, and 16 seconds, but the interface must read the actual stages. There is no suggestion list ([ADR-0001](docs/adr/0001-free-text-guesses.md)): the player types the title and the Guess action submits it; an empty answer action is Skip or Give up at the final stage. The result replaces the round and offers replay, share, and next round. Keep this behavior unless a later task explicitly changes it.

The existing app uses Next.js, CSS, React, and browser audio. The catalogue and cover assets are generated outside the repository. The redesign should remain workable with no cover, no playable songs, guest mode, account errors, and no leaderboard connection.

## 2. Research and rationale

| Evidence | What it means here |
|---|---|
| Repository: Game, Timeline, PlayButton, GuessBar, ResultCard, GameMenu, AuthDialog, and i18n messages | The round is the main product. A sidebar, album grid, or persistent player bar would consume space without serving the current flow. |
| [Atlassian design tokens](https://atlassian.design/foundations/design-tokens) | Tokens should describe a role such as action, text, border, or result, so the system stays coherent as components change. |
| [Atlassian spacing guidance](https://atlassian.design/foundations/spacing) | Repeated spacing and varied grouping make hierarchy easier to scan. Use the poster's dense details around a few large focal points. |
| [Apple guidance on game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) | Controls need symbols that describe their actions and visible press feedback. The playback control and answer action should be unmistakable. |
| [Apple guidance on audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio) | Playback should follow familiar expectations and user initiation. Decorative sound effects would compete with the clue. |
| [WCAG 2.2](https://www.w3.org/TR/wcag/) and [target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | Ordinary text needs 4.5:1 contrast; meaningful nontext graphics need 3:1. Pointer targets need at least 24×24 CSS px or enough separation. This design aims for 44px primary controls. |
| [Anton font metadata](https://github.com/google/fonts/blob/main/ofl/anton/METADATA.pb) and [Be Vietnam Pro metadata](https://github.com/google/fonts/blob/main/ofl/bevietnampro/METADATA.pb) | Both include Vietnamese glyph subsets and open licenses. Anton supplies the poster headline; Be Vietnam Pro handles UI, titles, artists, and readable Vietnamese copy. |

The gig poster concept, layout, and palette are design decisions for this app. The external sources support system structure, font coverage, and interaction/accessibility rules; they do not prescribe this visual style.

## 3. Visual language

### Signature elements

- **Yellow venue wall:** the page background is warm yellow with optional faint halftone dots. Use dots at very low opacity and keep them away from dense text.
- **Printed play card:** cream paper, thick ink border, and a hard offset shadow. One main card holds the round. Avoid a stack of nested cards.
- **Display type:** large, compressed poster headlines. Use a short English wordmark or concise title. Functional Vietnamese labels and song titles use Be Vietnam Pro for consistent tone marks and wrapping.
- **Setlist strip:** actual reveal stages appear as five marked segments. Current and unlocked segments gain emphasis; future ones remain clear but quieter.
- **Coral hit:** a single bright accent marks the play action, current stage, and win energy. Ink and cream carry the rest of the interface.
- **Ink rules and stamps:** thick horizontal lines, small edition labels, and a result stamp add print character. They carry information or divide content.

### Visual hierarchy

1. Current listening action and duration.
2. Revealed stage and the cost of moving to the next clue.
3. Answer field and Skip, Guess, or Give up action.
4. Difficulty and genre context.
5. Streak, account, menu, and leaderboard.

Use the boldest headline only once per view. The active round is a game surface, so the decorative introduction from the preview is optional on desktop and absent above the playable controls on phones.

### What to avoid

- Generic equalizer animation, fabricated audio waveform, or spinning record.
- Real gig posters, copyrighted tour branding, artist photography, or album art before the answer.
- Coral body text on cream: its contrast is too low.
- All caps for Vietnamese sentences, long song names, artist names, or form labels.
- Tilted buttons and text fields. A slight card rotation can appear in editorial artwork, but interactive controls must stay aligned and readable.
- Shadows on every chip and panel; reserve the offset shadow for the main card and primary pressable surfaces.

## 4. Foundations

### 4.1 Color tokens

| Token | Hex | Meaning |
|---|---|---|
| color.wall | #F9E549 | Page background and high energy field |
| color.paper | #FFF9E9 | Game card, result card, dialogs where appropriate |
| color.ink | #172533 | Primary text, outlines, dark buttons |
| color.ink.soft | #485562 | Secondary text on cream |
| color.coral | #F46A48 | Play, current clue, result decoration, pressed detail |
| color.coral.soft | #F4A88E | Large decorative coral surface |
| color.coral.text | #A83227 | Small red text on cream, errors, negative result copy |
| color.line | #172533 | Structural rules and control borders |
| color.stage.rest | #CED4CA | Future stages and neutral chips |
| color.success | #196B56 | Correct result text on cream |
| color.focus | #174EB8 | Keyboard focus outline, chosen to stand apart from ink and coral |

The four main measured pairs are ink on yellow **12.11:1**, ink on cream **14.81:1**, ink on coral **5.19:1**, and dark red text on cream **6.34:1**. Coral on cream is only **2.85:1**, so use coral for large shapes, borders, or backgrounds and use ink or dark red for small text. Recheck composited colors and disabled states in the rendered UI. The values are starting specifications, not a claim that every future use automatically passes contrast.

**Distribution:** about 60% yellow or open wall, 30% cream game surface, and 10% ink/coral highlights. On small screens the cream card naturally occupies a larger proportion. Keep result artwork inside the result card; do not allow album art colors to recolor the whole UI.

### 4.2 Typography

| Role | Typeface | Desktop / phone | Weight and line height | Rule |
|---|---|---|---|---|
| Poster display | Anton | 80–112 / 42–60px | 400 / 0.95–1.0 | Short English brand or one short heading; never clip glyphs |
| Round heading | Be Vietnam Pro | 30 / 25px | 800 / 1.25 | Question or status within the card |
| Result song title | Be Vietnam Pro | 32 / 26px | 800 / 1.25 | Wrap freely; preserve Vietnamese diacritics |
| Section heading | Be Vietnam Pro | 20 / 18px | 700 / 1.3 | Drawer, result details |
| Body | Be Vietnam Pro | 16 / 16px | 400 / 1.5 | Instructions and account copy |
| Control | Be Vietnam Pro | 15 / 15px | 700 / 1.3 | Buttons, filters, tabs |
| Label | Be Vietnam Pro | 12 / 12px | 700 / 1.4 | Short metadata, stage labels |
| Duration / score | Be Vietnam Pro | 48 / 36px | 900 / 1.1 | Tabular numerals for changing numbers |

Self host font files with Vietnamese coverage and include their license notices. Use font-display: swap and a system sans fallback. Review the actual output with titles such as “Nơi Này Có Anh”, “Chúng Ta Của Hiện Tại”, and long artist credits. Never force song titles into a single fixed-height line. Reserve expanded tracking for short metadata. Do not track Vietnamese body text widely.

### 4.3 Space, shape, and depth

- Space scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px.
- Main card width: 480–520px maximum. Outer page width: 1120px maximum.
- Page gutters: 16px below 600px, 24px on tablet, 32px on desktop.
- Main card: 4px ink border, cream fill, 10px ink offset shadow on desktop and 6px on phone. Use 0–4px radius for printed panels, with a subtle 8–12px radius only where physical card corners help.
- Primary controls: straight edges or 4px radius and a 3–4px ink border. Inputs keep a stable rectangle. Small genre and tier chips can use 4px corners.
- Form controls: at least 48px high. Menu and close controls at least 44×44px.
- Ink separators: 2–4px for section divisions; 1px only for quiet inner rules.
- Interaction elevation: pressing a raised button shifts it 2–3px toward its shadow. The control remains in the same reading order.

### 4.4 Icons and graphic motifs

Use a limited 20–24px icon set: play, stop, search, menu, close, share, arrow, check, cross. Icons are ink silhouettes or sturdy strokes that suit the poster weight. Text names every action. A starburst or stamp can appear once in a result or desktop poster area; it cannot overlap the answer form. Halftone texture is decorative and must disappear in forced colors and reduced data contexts if delivered as an asset.

## 5. Responsive compositions

### Active round, mobile first

At 320–599px, show a compact header, optional one-line filter context, then the printed card and answer form. The card contains the question, current stage, reveal strip, play control, and current clip length. Put the answer field and its changing action immediately after the card. Streak stays quiet below. The large editorial headline from the preview should not push play below the first view.

~~~text
menu  what the song           account
genre / difficulty context
╔════════════════════════════════════╗
║ WTS / LIVE ROUND       VIETNAMESE   ║
║ Clue 1 of 5                        ║
║ GUESS THE TRACK                    ║
║ [0.1][0.5][2][8][16]              ║
║ [  PLAY  ]     0.1s               ║
╚════════════════════════════════════╝
[ Song or artist... ][ Skip / Guess ]
streak · best
~~~

This is a hierarchy diagram, not final copy. Stage count and length come from the actual round. There is no invented overall round number. The interface does not reveal the song's genre if that information would narrow the answer beyond the player's chosen filter.

### Desktop

At 900px and wider, the play card remains the central 480–520px column. A poster headline and a short “how to play” statement may sit to its left. The page should feel like one composed flyer rather than a dashboard. A secondary stats rail is optional only if it does not compete with the clue. Do not create a sidebar or album grid for this scope.

### Result

Replace the active card in place with a result poster. Place a correct/incorrect text stamp, cover or typographic fallback, title, artist, score, stage history, replay, share, and the prominent next-round action. A loss shows the answer and zero points plainly. The result should read in this order on a phone: outcome, song, score, actions. Share is secondary; Next song or Try again is the main CTA. The existing share squares remain available and their meanings should be explained through adjacent text or accessible names.

### Drawer, account, and secondary screens

The drawer is the “back of the flyer”: how to play, genre, stats, leaderboard, and language. Use a cream or ink surface with clear grouping and generous reading space; avoid a decorative headline in every subsection. The account dialog uses labeled fields, visible error copy, and one primary submit button. If the account service is unavailable, the game remains playable as a guest. These states use the same palette and type system.

## 6. Component specifications

| Component | Default and hierarchy | State behavior |
|---|---|---|
| Play button | Coral fill, ink glyph and border, about 112×112px on desktop and at least 88×88px on phone. The real clip length sits beside it. | Play and stop have distinct symbols and accessible names. Loading shows a stable busy state. Press shifts toward its offset shadow. No autoplay. |
| Reveal strip | One segment per actual stage, labeled with duration. Future stages are neutral; current is ink filled or strongly outlined; unlocked history uses coral. | On unlock, mark the new stage and show its actual duration. A brief 180–240ms transition is enough. The strip is informational, not a seek control. |
| Difficulty choices | Be Vietnam Pro labels, full names, and selected ink treatment. | Available, selected, focus, and unavailable states differ by text/shape as well as color. Zero-song tier stays understandable. |
| Genre picker | In the drawer, grouped or searchable when the 20-genre catalogue is populated. | The chosen genre appears in the round context. Selection can start a new round under current behavior; do not silently imply the current song merely changed label. |
| Guess field | 48px or taller, ink border on cream, visible label. | Free text, no suggestion list. A wrong guess is echoed under the field with no "close" signal. Enter submits. |
| Changing action | A single companion button labelled Skip, Guess, or Give up. | Guess uses ink fill or coral fill with ink text; Skip is neutral; Give up uses dark red text and a strong outline. The label communicates the action without icon decoding. |
| Result cover | 160–176px square, only after round resolves. | Missing art becomes a typographic print tile using song initials. Keep title and artist as text outside the image. |
| Result stamp | Bold outcome word plus check/cross shape. | Correct, wrong, and give up are distinct in words and color. Animate only on entry; no ongoing pulse. |
| Next / Try again | Highest priority result action, full width on phone if space is tight. | Visible at 200% zoom with scrolling. Disabled only during actual transition. |
| Leaderboard | Tabular numerals, row rules, rank emphasis in ink/coral. | Loading, empty, guest, error, and current-user rows retain clear text. Avoid color as the sole rank cue. |
| Menu / account dialog | Strong ink header rule, spacious field labels, stable close target. | Escape closes; focus remains visible and returns to the trigger. Errors appear beside the relevant form region. |

## 7. Copy, language, and accessibility

### Voice

Short, lively, and clear. Gig poster energy belongs in headings and visual rhythm. Functional copy remains plain: the player should immediately understand Play, Skip, Guess, Give up, Listen again, Share, and Next song. Keep the existing Vietnamese and English message catalogue as the source of functional strings. New text gets both translations in the same change.

Use natural Vietnamese casing, for example “Đoán bài hát”, “Bỏ qua”, and “Bài tiếp”. Do not apply CSS uppercase to Vietnamese body labels or song metadata. The English marketing style “HEAR IT. NAME IT.” from the preview is optional on desktop; its Vietnamese version should be written as natural copy, not a literal shout.

### Accessibility acceptance rules

- Follow [WCAG 2.2 AA](https://www.w3.org/TR/wcag/): at least 4.5:1 for ordinary text, 3:1 for large text and meaningful nontext boundaries, visible focus, keyboard operation, and reflow.
- Aim for 44×44px touch targets in the play flow. The WCAG AA floor is 24×24px with its documented spacing exceptions. Avoid tiny close and filter targets.
- Focus ring uses the blue focus token at 3px with an offset, or an equivalent high-contrast treatment on yellow, cream, coral, and ink surfaces. Never remove a browser focus outline without replacement.
- The stage text announces the new unlocked duration once. Do not stream live playback progress into an aria-live region.
- Give the play button a changing accessible name for play/stop and a true disabled/loading state. The result status is announced politely once.
- The answer field is a plain text input: no combobox semantics, autocorrect and autocapitalize off, and a polite status line for the echoed wrong guess.
- Respect prefers-reduced-motion. Remove halftone in forced colors if it harms readability. Support 200% text zoom, long titles, and the mobile on-screen keyboard without clipping actions.
- The clue is inherently audio based, so visual status does not replace audio; it makes the interface and result usable to players who cannot perceive color or decorative motion.

## 8. Motion and interaction principles

Motion should behave like print coming alive: a card enters once, a stage inks in, a button presses, and the result receives one stamp. Suggested durations are 120ms for press/hover, 180–240ms for stage changes, and 250–320ms for a result entry. Use transform and opacity where possible. Reduce motion to immediate state changes under the user's preference.

The sample audio is the sole sound cue. Do not add applause, clicks, countdown ticks, or background music. Playing and replaying remain explicit user actions. The demo's simulated playback is only a visual preview and should not be copied as actual audio behavior.

## 9. Token structure and implementation map

Separate primitive palette values from semantic roles. Components should ask for an action, text, surface, or status token rather than directly reading an arbitrary color. A future token set could start like this:

~~~css
:root {
  --yellow-300: #f9e549;
  --cream-100: #fff9e9;
  --ink-900: #172533;
  --coral-500: #f46a48;
  --red-700: #a83227;

  --color-page: var(--yellow-300);
  --color-card: var(--cream-100);
  --color-text: var(--ink-900);
  --color-action: var(--coral-500);
  --color-action-text: var(--ink-900);
  --color-error-text: var(--red-700);
  --color-focus: #174eb8;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --border-card: 4px solid var(--ink-900);
  --shadow-card: 10px 10px 0 var(--ink-900);
}
~~~

| Current file | Implementation responsibilities |
|---|---|
| apps/web/app/tokens.css | New primitive and semantic colors, type, spacing, border, shadow, and interaction tokens. |
| apps/web/app/globals.css | Page surface, button and form states, card, drawer, dialog, focus, responsive behavior, reduced motion. |
| apps/web/app/page.tsx | Mobile-first header and editorial desktop composition; loading and empty states. |
| apps/web/app/components/Game.tsx | Round composition and the position of filters, stage, play, guess, and result. Preserve game logic. |
| Timeline.tsx and PlayButton.tsx | Actual stage strip and primary playback affordance, including state text and accessible names. |
| GuessBar.tsx and ResultCard.tsx | Answer form, suggestion list, result poster, art fallback, replay, share, and next action. |
| TierChips.tsx and PillRow.tsx | Available, selected, unavailable, and responsive choices. |
| GameMenu.tsx, StreakBar.tsx, Leaderboard.tsx | Secondary information in the flyer language. |
| AuthDialog.tsx, AccountBar.tsx, GuestNotice.tsx | Dialog and account affordances in the new visual system. |
| apps/web/lib/i18n/messages.ts | Every new label in Vietnamese and English. |

### Implementation and review order

1. Make final 360px and 1280px compositions with real Vietnamese titles, a long artist credit, and a non-default clip ladder.
2. Add fonts and tokens, then page and card foundations.
3. Build the play flow: stage strip, button, answer form, filter context, and all states.
4. Build result, drawer, leaderboard, and account surfaces.
5. Review phone keyboards, keyboard navigation, screen reader names, 200% zoom, reduced motion, forced colors, actual browser audio, and no pre-answer art leak.

**Definition of done:** the shipped round is immediately playable and recognizably Gig Poster; every current game state uses the same system; Vietnamese text remains legible; the stage display reflects actual game data; interactions meet the accessibility rules above. The implementation task may refine exact spacing after seeing it in a browser, with any material design decision recorded in this document.
