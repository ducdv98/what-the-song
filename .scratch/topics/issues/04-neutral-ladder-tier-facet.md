# Make Stage ladder, Tier and Facet Topic-neutral

Status: ready-for-agent
Blocked by: 03

Replace seconds-typed Stages and `STAGE_TARGETS` in core with a ladder of Clue positions supplied by the Topic; Songs still yield 0.1/0.5/2/8/16s. Score stays a function of position within the ladder. Tier is shared with the same five levels (absent = medium). Genre becomes an optional Facet declared by the Topic and shown by the menu generically.

## Done when
- Score tests pass for ladders of 1, 3, 5 and 7 Stages.
- The ingest/ladder consistency test still holds for Songs.
- The menu shows a Topic's Facets without Song-specific code.
