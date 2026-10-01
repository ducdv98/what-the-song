import { DataSource } from 'typeorm';
import { InitAccounts1790000000000 } from '../src/database/migrations/1790000000000-InitAccounts.js';
import { RecordTopicOnRounds1790000000001 } from '../src/database/migrations/1790000000001-RecordTopicOnRounds.js';

const url = process.env.DATABASE_URL!; // set by test/setup-env.ts

describe('record Topic migration', () => {
  it('preserves old rounds and stats on upgrade and restores old columns on downgrade', async () => {
    const db = new DataSource({
      type: 'postgres',
      url,
      migrations: [InitAccounts1790000000000],
      migrationsTransactionMode: 'each',
    });
    await db.initialize();
    try {
      await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
      await db.runMigrations();
      const [user] = await db.query(`
        INSERT INTO users (username, email, password_hash)
        VALUES ('legacy', 'legacy@example.com', 'hash') RETURNING id`);
      await db.query(
        `
        INSERT INTO rounds (user_id, song_id, won, score, difficulty, genre)
        VALUES ($1, 'old-song', true, 800, 'medium', 'nhac-tre')`,
        [user.id],
      );
      await db.query(
        `
        INSERT INTO player_stats (user_id, played, won, current_streak, best_streak, total_score)
        VALUES ($1, 3, 2, 1, 2, 1600)`,
        [user.id],
      );

      // The next DataSource sees the first migration as applied and runs only the new one.
      const upgraded = new DataSource({
        type: 'postgres',
        url,
        migrations: [
          InitAccounts1790000000000,
          RecordTopicOnRounds1790000000001,
        ],
        migrationsTransactionMode: 'each',
      });
      await upgraded.initialize();
      try {
        expect((await upgraded.runMigrations()).map((m) => m.name)).toEqual([
          'RecordTopicOnRounds1790000000001',
        ]);
        const [round] = await upgraded.query(
          `SELECT topic, subject_id, facet FROM rounds`,
        );
        expect(round).toEqual({
          topic: 'songs',
          subject_id: 'old-song',
          facet: 'nhac-tre',
        });
        const [topicStats] = await upgraded.query(
          `
          SELECT topic, played, won, current_streak, best_streak, total_score
          FROM player_topic_stats WHERE user_id = $1`,
          [user.id],
        );
        expect(topicStats).toMatchObject({
          topic: 'songs',
          played: 3,
          won: 2,
          current_streak: 1,
          best_streak: 2,
          total_score: '1600',
        });
        const [global] = await upgraded.query(
          `SELECT played, total_score FROM player_stats WHERE user_id = $1`,
          [user.id],
        );
        expect(global).toEqual({ played: 3, total_score: '1600' });

        await upgraded.undoLastMigration();
        const [oldRound] = await upgraded.query(
          `SELECT song_id, genre FROM rounds`,
        );
        expect(oldRound).toEqual({ song_id: 'old-song', genre: 'nhac-tre' });
        const [oldStats] = await upgraded.query(
          `SELECT played, total_score FROM player_stats WHERE user_id = $1`,
          [user.id],
        );
        expect(oldStats).toEqual({ played: 3, total_score: '1600' });
        const [columns] = await upgraded.query(`
          SELECT count(*)::int AS n FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'rounds' AND column_name = 'topic'`);
        expect(columns.n).toBe(0);
        const [tables] = await upgraded.query(`
          SELECT count(*)::int AS n FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'player_topic_stats'`);
        expect(tables.n).toBe(0);
      } finally {
        await upgraded.destroy();
      }
    } finally {
      await db.destroy();
    }
  });
});
