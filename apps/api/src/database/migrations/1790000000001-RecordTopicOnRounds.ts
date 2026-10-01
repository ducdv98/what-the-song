import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordTopicOnRounds1790000000001 implements MigrationInterface {
  name = 'RecordTopicOnRounds1790000000001';

  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE rounds ADD COLUMN topic varchar(40) NOT NULL DEFAULT 'songs'`,
    );
    await q.query(`ALTER TABLE rounds RENAME COLUMN song_id TO subject_id`);
    await q.query(`ALTER TABLE rounds RENAME COLUMN genre TO facet`);
    await q.query(
      `CREATE INDEX rounds_topic_played_at_idx ON rounds (topic, played_at)`,
    );
    await q.query(`
      CREATE TABLE player_topic_stats (
        user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic          varchar(40) NOT NULL,
        played         integer NOT NULL DEFAULT 0,
        won            integer NOT NULL DEFAULT 0,
        current_streak integer NOT NULL DEFAULT 0,
        best_streak    integer NOT NULL DEFAULT 0,
        total_score    bigint NOT NULL DEFAULT 0,
        updated_at     timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, topic)
      )`);
    await q.query(`
      INSERT INTO player_topic_stats
        (user_id, topic, played, won, current_streak, best_streak, total_score, updated_at)
      SELECT user_id, 'songs', played, won, current_streak, best_streak, total_score, updated_at
      FROM player_stats`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE player_topic_stats`);
    await q.query(`DROP INDEX rounds_topic_played_at_idx`);
    await q.query(`ALTER TABLE rounds RENAME COLUMN subject_id TO song_id`);
    await q.query(`ALTER TABLE rounds RENAME COLUMN facet TO genre`);
    await q.query(`ALTER TABLE rounds DROP COLUMN topic`);
  }
}
