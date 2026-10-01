# Serve each Topic at /[topic]

Status: done
Blocked by: 03, 05, 06

Add `/[topic]` routes driven by the registry and renderer registry. `/` redirects to `/songs` while only one Topic is playable. Unknown Topics 404.

## Done when
- `/songs` plays exactly as `/` did; `/` redirects.
- Stats and rounds from `/songs` are recorded with topic `songs`.

## Comments

`/[topic]` is statically generated from the registry. The root page and Caddy redirect to `/songs`; Caddy serves unknown paths as 404. The Songs renderer receives the route's Topic id for round reports.
