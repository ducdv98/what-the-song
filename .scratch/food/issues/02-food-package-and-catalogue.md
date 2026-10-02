# `@wts/topic-food`: Dish, matcher, catalogue validator

Status: done

Add `@wts/topic-food` exporting one value that satisfies the core `Topic` contract, and register it in `@wts/topics`. Model it on `@wts/topic-songs`.

- Dish shape: id, name, aliases, tier, region, photo reference, optional focal point, `credit` (author, licence, source URL), all validated.
- `ladder(dish)` returns five Zoom Clues from the Topic's fixed fractions (25/40/60/80/100, one array) with the optional focal point.
- `matches` uses the shared accent folding: name or Alias, no partial credit.
- `validateCatalogue` rejects a missing Credit, a licence outside CC BY / CC BY-SA / CC0, an unknown region, and any Alias equal to another Dish's name or Alias.
- One Facet, region, with labels in vi and en; a Dish with no region maps to Toàn quốc.
- The core is untouched.

## Done when
- Unit tests cover matching (diacritics, tone placement, no partial credit), the ladder, the Facet, and each validation failure.
- The registry lists `food`, and the API accepts `food` as a Topic id in round reports with no migration.

## Comments

Implemented by Codex, verified by Claude: typecheck, lint, tests pass. Also limits `/[topic]` static routes to Topics that have a renderer, so registering `food` did not create a page with no UI.
