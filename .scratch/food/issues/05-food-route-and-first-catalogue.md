# `/food` route and the first catalogue

Status: needs-triage
Blocked by: 01, 02, 03, 04

Serve `/food` through the registry and renderer registry, with `/` still redirecting to `/songs`. After the owner corrects the candidate list from issue 01, ingest about 60 Dishes and publish them.

## Done when
- `/food` plays end to end with the real catalogue, and rounds record topic `food` with the Dish id as `subject_id` and the region as `facet`.
- Score, Streak and the Leaderboard include Food, and the per-Topic view works.
- The catalogue is balanced across Tiers and regions, and every Dish shows its Credit.
- README and `docs/` mention the Food Topic and its photo licensing rule.
