# People catalogue

`/people` asks players to guess Vietnamese public figures as one head-and-shoulders
photo appears from the hair down over five Stages. Each Person has one **field**
Facet: Ca sĩ (Singer), Diễn viên (Actor), MC / Hài (MC / Comedy), Streamer, or
Influencer. The picker uses the Topic's Vietnamese and English labels. The
catalogue seed at `.scratch/people/catalogue.jsonl` has 342 Persons (62 to 73
per field) with Tiers spread across the catalogue. It is the 60-Person launch
seed (`launch.jsonl`) plus `candidates-expansion.jsonl` (282 more). The eight
candidates flagged for poor crops in `.scratch/people/candidates.md` and the
photos dropped on review are absent from it.

Each JSONL seed row supplies `name`, optional `aliases`, `tier`, `field`,
`photo_url`, and `source_url`. `tools/ingest_people.py` writes the catalogue
and content-hashed JPEGs to the gitignored local master at
`apps/web/public/assets/people/`. Ingest checks image dimensions and warns
when the aspect ratio is outside the expected head-and-shoulders range; review
the actual crop before publishing. The browser loads
`/assets/people/catalogue.json` at runtime, so the route can be built without
the local photo library.

```sh
python tools/ingest_people.py .scratch/people/catalogue.jsonl
python tools/ingest_people.py --publish --dry-run
python tools/ingest_people.py --publish
```

`--publish` needs the COS uploader variables documented in the README. It
uploads missing photos, verifies assets, and publishes the catalogue last;
existing photo keys are never overwritten. Without COS, copy the local master
to the server and copy `catalogue.json` last.

Per [ADR 0004](adr/0004-person-photos-without-licence.md), People photos are
already published online and are used without a licence check or displayed
Credit. Only public figures with established public profiles are eligible;
private individuals and minors are excluded. To remove a Person and their photo
on request, delete the row from the seed, rerun the ingest, then run
`python tools/ingest_people.py --publish --prune --dry-run` and, once the plan
lists only that photo, the same command without `--dry-run`.

Each Person's source URL is required for internal tracking and removal, and
must never appear in the player interface.
