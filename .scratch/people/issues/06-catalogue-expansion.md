# People catalogue expansion to 300+

Status: done

Grow the People catalogue from the 60-Person launch seed to more than 300 Persons.

- New research goes in `.scratch/people/expansion-<field>.jsonl`, merged into `.scratch/people/candidates-expansion.jsonl` (same row shape as `candidates.jsonl`).
- Same rules as issue 01 and ADR 0004: adult public figures with an established profile, no minors or private individuals, head-and-shoulders photo that fetches as an image, required `source_url`.
- About 45 to 55 new per field (Ca sĩ, Diễn viên, MC / Hài, Streamer, Influencer), Tiers spread, no name or Alias collision (accent-folded) with any existing row.
- A combined seed (launch + usable candidates + expansion) passes `python tools/validate_people_seed.py`.

## Done when
- The combined seed has more than 300 valid rows, balanced across fields.
- The owner has reviewed the new rows; the combined seed is ingested and published.

## Comments
Done locally, not published. Five Codex research runs (one per field) found 270 new Persons; with 60 launch rows and 23 unused issue 01 candidates the seed `.scratch/people/catalogue.jsonl` was 353 rows. After review it has **342 Persons** (Ca sĩ 73, Streamer 72, MC / Hài 71, Diễn viên 64, Influencer 62; Tiers 77 easy / 83 medium / 82 hard / 66 expert / 34 impossible). New rows are in `candidates-expansion.jsonl`; `launch.jsonl` is unchanged.

Review applied:
- 12 Persons the agents put in two fields were kept under MC / Hài; Midu kept as Diễn viên.
- Dropped for unusable photos or possible minors, found by the ingest crop warning and a contact-sheet check: Văn Mai Hương, Gilgaming Tv, Hannah Olala, Elly Trần, Diệp Lê, Đỗ Duy Nam, Gầy Best Leesin, Bích Ngọc, Bạch Phong Tv. Also dropped after a Codex eligibility review: CiiN (source 404) and Nga Nguyễn (photo of a different person).
- Codex review fixes: five Persons moved to the right field, four Tiers corrected, duplicate aliases removed, one source URL replaced, Bùi Xuân Thảo renamed Góc của Rư.
- All 342 photos ingested into the gitignored local master with the validated seed.

For the owner:
1. Run `python tools/ingest_people.py --publish --dry-run`, then without `--dry-run` (needs the COS variables).
2. Only about 50 of the 342 photos were looked at; the other 48 in a random sample were fine, the rest were judged only by the crop ratio. 55 Streamer photos and some others come through the `wsrv.nl` proxy or `nguoinoitieng.tv` (which returned HTTP 418 for a while during ingest); re-ingest is cached and unaffected.
3. Tiers and fields come from the agents and one review pass; skim them before launch.
