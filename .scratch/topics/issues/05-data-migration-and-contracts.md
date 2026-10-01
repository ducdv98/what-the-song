# Record Topic on every Round: migration and contracts

Status: ready-for-agent
Blocked by: 03, 04

Add a migration: `rounds.topic` (string, default `songs`), rename `song_id` to `subject_id` and `genre` to `facet`; stats gain per-Topic views alongside the global totals. Update `RoundReport`, DTOs, the Topic id pattern and Subject id pattern in contracts. Existing data must survive and the migration must reverse.

## Done when
- Migration up/down passes on a database with existing rounds and stats.
- Global Score, Streak and Leaderboard are unchanged for existing players.
- Leaderboard and stats can be queried per Topic (e2e test).
