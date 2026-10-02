# `/people` route and first catalogue

Status: ready-for-agent
Blocked by: 03, 04, 01

Serve `/people`, with the field Facet filter, and publish the first catalogue of about 60 Persons from the reviewed candidate list.

## Done when
- A Person is playable end to end at `/people`.
- Score, Streak and the Leaderboard record the Topic as `people`.
- The catalogue meets the launch balance: at least 8 per field, balanced across Tiers.

- The COS signer allow-list in `apps/api/src/assets/asset-urls.ts` accepts `people/<slug>/<hash>.jpg` keys, with a test (found in the issue 04 review).
- The eight candidates whose photos are not head-and-shoulders crops (listed in `.scratch/people/candidates.md`) are replaced or left out of the first catalogue.
