# Rename @wts/game to @wts/core and define the Topic contract

Status: ready-for-agent
Blocked by: none

Rename the package and every import. Add the `Topic` interface (id, ladder from a Subject's Clues, matcher, catalogue validator, declared Facets) and a `Subject` base shape. No behavior change.

## Done when
- No reference to `@wts/game` remains (code, Docker, turbo, docs).
- Build, typecheck and all tests pass unchanged.
- The `Topic` contract is exported and covered by a type-level test.
