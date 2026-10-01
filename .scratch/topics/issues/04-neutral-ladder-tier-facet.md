# Make Stage ladder, Tier and Facet Topic-neutral

Status: done
Blocked by: 03

Replace seconds-typed Stages and `STAGE_TARGETS` in core with a ladder of Clue positions supplied by the Topic; Songs still yield 0.1/0.5/2/8/16s. Score stays a function of position within the ladder. Tier is shared with the same five levels (absent = medium). Genre becomes an optional Facet declared by the Topic and shown by the menu generically.

## Done when
- Score tests pass for ladders of 1, 3, 5 and 7 Stages.
- The ingest/ladder consistency test still holds for Songs.
- The menu shows a Topic's Facets without Song-specific code.

## Comments

Implemented in 82b9c57. Verified: round.test.ts scores ladders of 1/3/5/7 Stages; test_ingest.py reads Songs STAGE_TARGETS from topic-songs/catalogue.ts; Game.tsx renders menu pickers from `topic.facets`. Note: Game.tsx still persists the genre pref and hardcodes songsTopic (to be generalised by issue 07).
