# Serve each Topic at /[topic]

Status: ready-for-agent
Blocked by: 03, 05, 06

Add `/[topic]` routes driven by the registry and renderer registry. `/` redirects to `/songs` while only one Topic is playable. Unknown Topics 404.

## Done when
- `/songs` plays exactly as `/` did; `/` redirects.
- Stats and rounds from `/songs` are recorded with topic `songs`.
