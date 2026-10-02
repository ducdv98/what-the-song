# Zoom renderer in the web app

Status: done
Blocked by: 02

Add the Food renderer to `apps/web/lib/topics/renderers.tsx`, keyed by `food`. A Stage shows the Dish's photo cropped to the Stage's fraction around the centre or the Dish's focal point, with the whole photo on the last Stage. After the Round, show the Credit. The region Facet is offered as the narrowing filter, using the shared Facet UI.

- Use CSS cropping, with the full photo loaded once; the crop changes with the Stage without a refetch.
- Works on a phone width; the Credit link is readable.
- The Meme, Score, Streak and Skip behave as for other Topics.

## Done when
- A Dish is playable end to end in the browser against a fixture catalogue, across all five Stages, won and lost.
- Component tests cover crop at each Stage, the focal-point override and the Credit display.

## Comments

Implemented by Codex, verified by Claude: typecheck, lint, web tests, and build (includes `/food`) pass. Shared components (TopicPage, ResultCard, GuessBar) branch on Topic for Food copy; if a fourth Topic arrives this should move into per-Topic renderers.
