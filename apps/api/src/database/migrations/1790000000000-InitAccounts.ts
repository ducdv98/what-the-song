import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Accounts, refresh tokens, and the per-round record a leaderboard will be
 * built from. Written by hand rather than generated, so the case-insensitive
 * unique indexes and the leaderboard-shaped indexes are exactly as intended.
 */
export class InitAccounts1790000000000 implements MigrationInterface {
  name = 'InitAccounts1790000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username      varchar(20)  NOT NULL,
        email         varchar(254) NOT NULL,
        password_hash varchar(255) NOT NULL,
        created_at    timestamptz  NOT NULL DEFAULT now(),
        updated_at    timestamptz  NOT NULL DEFAULT now()
      )`);
    // Case-insensitive uniqueness; names are referenced by UsersService.
    await q.query(
      `CREATE UNIQUE INDEX users_username_lower_key ON users (lower(username))`,
    );
    await q.query(
      `CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email))`,
    );

    await q.query(`
      CREATE TABLE refresh_tokens (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_id   uuid NOT NULL,
        token_hash  char(64) NOT NULL UNIQUE,
        expires_at  timestamptz NOT NULL,
        revoked_at  timestamptz,
        user_agent  varchar(255),
        created_at  timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(
      `CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id)`,
    );
    await q.query(
      `CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id)`,
    );
    await q.query(
      `CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at)`,
    );

    await q.query(`
      CREATE TABLE rounds (
        id          bigserial PRIMARY KEY,
        user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        song_id     varchar(120) NOT NULL,
        won         boolean NOT NULL,
        score       integer NOT NULL CHECK (score BETWEEN 0 AND 1000),
        difficulty  varchar(20) NOT NULL,
        genre       varchar(40),
        played_at   timestamptz NOT NULL DEFAULT now(),
        CHECK (won OR score = 0)
      )`);
    // A player's history, and "top scores in a time window" for leaderboards.
    await q.query(
      `CREATE INDEX rounds_user_played_idx ON rounds (user_id, played_at DESC)`,
    );
    await q.query(`CREATE INDEX rounds_played_at_idx ON rounds (played_at)`);

    await q.query(`
      CREATE TABLE player_stats (
        user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        played         integer NOT NULL DEFAULT 0,
        won            integer NOT NULL DEFAULT 0,
        current_streak integer NOT NULL DEFAULT 0,
        best_streak    integer NOT NULL DEFAULT 0,
        total_score    bigint  NOT NULL DEFAULT 0,
        updated_at     timestamptz NOT NULL DEFAULT now()
      )`);
    // All-time leaderboard reads.
    await q.query(
      `CREATE INDEX player_stats_total_score_idx ON player_stats (total_score DESC)`,
    );
    await q.query(
      `CREATE INDEX player_stats_best_streak_idx ON player_stats (best_streak DESC)`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE player_stats`);
    await q.query(`DROP TABLE rounds`);
    await q.query(`DROP TABLE refresh_tokens`);
    await q.query(`DROP TABLE users`);
  }
}
