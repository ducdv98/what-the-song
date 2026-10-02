# People ingest tool

Status: ready-for-agent
Blocked by: 02

A People tool takes a seed file of `{ name, aliases, tier, field, photo_url, source_url }`, downloads each image, and writes the catalogue and assets under `people/<slug>/`.

- Refuses a seed row with no `source_url`, an unknown field or an unreadable image.
- Warns when the image is not a head-and-shoulders crop (aspect ratio check).
- Same local-master and never-overwrite publish rules as ADR 0003.

## Done when
- Tests cover each refusal and a successful ingest.
- A seed of a few Persons produces a catalogue the validator accepts.
