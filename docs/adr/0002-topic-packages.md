# Each Topic is its own package, over a shared core and a registry

The game is growing beyond Songs (People next, more later), so the rules shared by every Topic live in a topic-neutral core (`@wts/core`, renamed from `@wts/game`), and each Topic is its own package (`@wts/topic-songs`, `@wts/topic-people`) exporting one value that satisfies the core's `Topic` contract. A small `@wts/topics` package imports them all and exports the registry that the API and the web app share; renderers stay in the web app, keyed by Topic id.

We chose this over branching on the Topic inside one package, and over a registry kept separately in each app, because more Topics are expected and a package boundary is enforced where a convention is not: a Topic cannot reach into the core's internals, and the API and the web app cannot disagree about which Topics exist. The cost is a package per Topic and a rename of `@wts/game`; that is cheap now and grows with every file that imports the old name.

Related decisions made together:

- A Topic id is a plain string validated against the registry, never a database enum, so a new Topic needs no migration. `rounds.song_id` becomes `subject_id`, and a `topic` column defaults existing rows to `songs`.
- Each Topic supplies its own Guess matcher; the Vietnamese accent folding stays a shared utility.
- Assets and catalogues live in a folder per Topic (`/assets/<topic>/`), with one ingest tool per Topic. The old `/clips/...` URLs redirect.
- Tier is shared across Topics; Genre becomes a generic optional Facet that a Topic declares (`rounds.genre` becomes `facet`).
