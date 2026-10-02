# API: Tier-aware validation and old-client clamp

Status: done
Blocked by: 01

See `spec.md` (Scoring decisions, API validation, Old clients).

Make round recording accept the new Score scale.

A reported loss must still be 0. A win below the floor for its reported Tier is rejected. A win above that Tier's ceiling is clamped down to the ceiling, not rejected, so a cached old client never loses a Round. Unknown Tier is still rejected by existing validation. No contract or schema change, no migration.

## Done when
- Win in range for its Tier is stored as reported.
- Win above the Tier ceiling is stored clamped (also in the totals and Leaderboard sums).
- Win below the Tier floor is rejected; loss with non-zero Score is rejected.
- Covered by the stats service spec and the e2e spec.
