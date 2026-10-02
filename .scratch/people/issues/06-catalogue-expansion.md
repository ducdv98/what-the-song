# People catalogue expansion to 300+

Status: ready-for-agent

Grow the People catalogue from the 60-Person launch seed to more than 300 Persons.

- New research goes in `.scratch/people/expansion-<field>.jsonl`, merged into `.scratch/people/candidates-expansion.jsonl` (same row shape as `candidates.jsonl`).
- Same rules as issue 01 and ADR 0004: adult public figures with an established profile, no minors or private individuals, head-and-shoulders photo that fetches as an image, required `source_url`.
- About 45 to 55 new per field (Ca sĩ, Diễn viên, MC / Hài, Streamer, Influencer), Tiers spread, no name or Alias collision (accent-folded) with any existing row.
- A combined seed (launch + usable candidates + expansion) passes `python tools/validate_people_seed.py`.

## Done when
- The combined seed has more than 300 valid rows, balanced across fields.
- The owner has reviewed the new rows; the combined seed is ingested and published.

## Comments
