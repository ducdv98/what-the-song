# Food: a Topic of Vietnamese dishes

Status: ready-for-agent
Vocabulary: `CONTEXT.md` (Dish, Zoom, Credit, Facet, Tier). Architecture: `docs/adr/0002-topic-packages.md` (Topic packages), `docs/adr/0003-clips-in-private-cos-bucket.md` (assets in COS).

## Goal

Add a third Topic, **Food**: the player guesses a Vietnamese dish (traditional and regional) from a photo that zooms out over five Stages. It uses the existing Topic contract, registry, `/[topic]` routes and asset pipeline; the shared core does not change.

## Decisions

1. Subject is a **Dish**: dish, drink or dessert, known by its canonical Vietnamese name. A regional variant is its own Dish only when it has its own name (Bún bò Huế, Mì Quảng); otherwise region is a Facet.
2. Clue is **Zoom**: centre crop of one full photo, zooming out. Fixed per Topic at 25/40/60/80/100% (placeholders, one array to tune), with an optional per-Dish focal point (x, y). Five Stages, like the other Topics. The full photo goes to the browser; cheating is accepted.
3. Matching follows Songs: the Vietnamese name or an Alias, accent-folded, no partial credit. English glosses are Aliases only where commonly used. `validateCatalogue` rejects an Alias equal to another Dish's name or Alias, since matching only judges the Round's own Dish.
4. One Facet, **region**: Bắc, Trung, Nam, Tây Nguyên, Toàn quốc (default for a Dish with no single home region). One value per Dish.
5. Tier is national fame (how widely known the dish is), not photo difficulty.
6. Photos come from Wikimedia Commons, CC BY, CC BY-SA or CC0 only. Each Dish carries a **Credit** (author, licence, source URL) shown after the Round. Credit is part of the Dish shape, not the core `Subject`.
7. Package `@wts/topic-food`, registered in `@wts/topics`; Zoom renderer in `apps/web` keyed by `food`; route `/food`. `/` keeps redirecting to `/songs`; no Topic switcher in this effort.
8. Ingest: a Food tool takes a seed file of `{ name, aliases, tier, region, commons_url }`, pulls the image and licence metadata from Commons, refuses other licences, and writes the catalogue. Same local-master and never-overwrite publish rules as ADR 0003; assets live under `food/<slug>/`.
9. Launch: about 60 Dishes, balanced across Tiers and regions, traditional dishes well represented. The candidate list (about 80) is drafted by the agent and corrected by the owner.

## Out of scope

Text clues, ingredients or non-dish food, partial-name matching, a second Facet axis (traditional vs everyday), Topic switcher on the home page, AI-generated or scraped photos, changes to Score, Streak or Leaderboard.

## Issues

01 candidate list research · 02 Food package and catalogue contract · 03 Zoom renderer · 04 ingest tool · 05 `/food` route and first catalogue
