# `@wts/topic-people`: Person, matcher, catalogue validator

Status: done

Add `@wts/topic-people` exporting one value that satisfies the core `Topic` contract, and register it in `@wts/topics`. Model it on `@wts/topic-food`.

- Person shape: id, name, aliases, tier, field, photo reference, optional Reveal override, source URL, all validated. No Credit.
- `ladder(person)` returns five Reveal Clues from the Topic's fixed fractions (15/35/60/85/100, one array), honouring the override.
- `matches` uses the shared accent folding: name or Alias, no partial credit.
- `validateCatalogue` rejects a missing source URL, an unknown field, and any Alias equal to another Person's name or Alias.
- One Facet, field, with labels in vi and en.
- The core is untouched.

## Done when
- Unit tests cover matching (diacritics, tone placement, no partial credit), the ladder and override, the Facet, and each validation failure.
- The registry lists `people`, and the API accepts `people` as a Topic id in round reports with no migration.

## Comments

Implemented by Codex, verified by Claude: typecheck and full test suite pass; standards and spec reviews found nothing. The API e2e test was updated but not run (no `TEST_DATABASE_URL` here). No renderer or page yet (issue 03).
