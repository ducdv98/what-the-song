import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { periodRange } from '@wts/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

/**
 * Runs the real app — same pipeline as main.ts — against a real Postgres.
 * Point TEST_DATABASE_URL at a throwaway database: its schema is dropped.
 */
const DATABASE_URL = process.env.DATABASE_URL!; // set by test/setup-env.ts

let app: INestApplication<Server>;
let db: DataSource;

beforeAll(async () => {
  // Start from an empty schema, so the migration itself is under test.
  const reset = new DataSource({ type: 'postgres', url: DATABASE_URL });
  await reset.initialize();
  await reset.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await reset.destroy();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  db = app.get(DataSource);
});

afterAll(async () => {
  await app?.close();
});

const http = () => request(app.getHttpServer());

describe('Round asset URLs', () => {
  const clip = 'songs/nnca/0123456789abcdef01234567.mp3';

  it('signs a Round for a guest in one call', async () => {
    const res = await http()
      .post('/api/assets/urls')
      .send({ keys: [clip, 'songs/nnca/cover-0123456789abcdef.jpg'] })
      .expect(200);
    expect(res.body.urls).toEqual({
      [clip]: `/assets/${clip}`,
      'songs/nnca/cover-0123456789abcdef.jpg':
        '/assets/songs/nnca/cover-0123456789abcdef.jpg',
    });
    expect(res.body.expiresAt).toEqual({
      [clip]: null,
      'songs/nnca/cover-0123456789abcdef.jpg': null,
    });
  });

  it('rejects keys outside the allow-list and more than 12 keys', async () => {
    for (const key of [
      'songs/nnca/done.json',
      'songs/../secret.mp3',
      'songs/nnca/cover-0123456789abcdef.mp3',
      'https://evil.example/clip.mp3',
    ]) {
      await http()
        .post('/api/assets/urls')
        .send({ keys: [key] })
        .expect(400);
    }
    await http()
      .post('/api/assets/urls')
      .send({
        keys: Array.from(
          { length: 13 },
          (_, i) => `songs/nnca/${i.toString(16).padStart(24, '0')}.mp3`,
        ),
      })
      .expect(400);
  });

  it('rate limits guest signing requests', async () => {
    for (let i = 0; i < 20; i++)
      await http()
        .post('/api/assets/urls')
        .set('X-Forwarded-For', '198.51.100.20')
        .send({ keys: [clip] })
        .expect(200);
    const res = await http()
      .post('/api/assets/urls')
      .set('X-Forwarded-For', '198.51.100.20')
      .send({ keys: [clip] })
      .expect(429);
    expect(res.body.code).toBe('rate_limited');
  });
});

/** name=value pairs from Set-Cookie, for replaying as a Cookie header. */
function cookies(res: request.Response): Record<string, string> {
  const out: Record<string, string> = {};
  const set = res.headers['set-cookie'] as unknown as string[] | undefined;
  for (const c of set ?? []) {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}
const cookieHeader = (jar: Record<string, string>) =>
  Object.entries(jar)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

const alice = {
  username: 'alice',
  email: 'Alice@Example.com',
  password: 'hunter2hunter2',
};
let jar: Record<string, string> = {};

describe('health', () => {
  it('reports the database up', async () => {
    const res = await http().get('/api/health').expect(200);
    expect(res.body.info.database.status).toBe('up');
  });
});

describe('registration', () => {
  it('a guest restores to null, with 200 not 401', async () => {
    const res = await http().get('/api/auth/session').expect(200);
    expect(res.body).toEqual({ user: null });
  });

  it('registers and signs in, with safe cookies', async () => {
    const res = await http().post('/api/auth/register').send(alice).expect(201);
    expect(res.body.user).toMatchObject({
      username: 'alice',
      email: 'alice@example.com',
    });
    expect(res.body.user.passwordHash).toBeUndefined();

    const set = (res.headers['set-cookie'] as unknown as string[]).join('\n');
    expect(set).toMatch(
      /wts_at=[^;]+; Max-Age=900; Path=\/api;.*HttpOnly; SameSite=Lax/,
    );
    expect(set).toMatch(
      /wts_rt=[^;]+; Path=\/api\/auth;.*HttpOnly; SameSite=Lax/,
    );
    jar = cookies(res);

    const me = await http()
      .get('/api/auth/me')
      .set('Cookie', cookieHeader(jar))
      .expect(200);
    expect(me.body.user.username).toBe('alice');
  });

  it('stores an argon2id hash, never the password', async () => {
    const [row] = await db.query(
      `SELECT password_hash FROM users WHERE username = 'alice'`,
    );
    expect(row.password_hash).toMatch(/^\$argon2id\$/);
  });

  it('usernames and emails are unique regardless of case', async () => {
    let res = await http()
      .post('/api/auth/register')
      .send({ ...alice, username: 'ALICE', email: 'z@example.com' })
      .expect(409);
    expect(res.body.code).toBe('username_taken');
    res = await http()
      .post('/api/auth/register')
      .send({ ...alice, username: 'alice2', email: 'ALICE@example.com' })
      .expect(409);
    expect(res.body.code).toBe('email_taken');
  });

  it('names the invalid fields, and rejects unknown ones', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send({
        username: 'có dấu',
        email: 'nope',
        password: 'short',
        isAdmin: true,
      })
      .expect(400);
    expect(res.body.code).toBe('validation_failed');
    expect(res.body.fields).toEqual(
      expect.arrayContaining(['username', 'email', 'password', 'isAdmin']),
    );
  });
});

describe('login', () => {
  it('works by username or email, case-insensitively', async () => {
    for (const identifier of [
      'alice',
      'ALICE',
      'alice@example.com',
      'Alice@Example.COM',
    ]) {
      const res = await http()
        .post('/api/auth/login')
        .send({ identifier, password: alice.password });
      expect(res.status, identifier).toBe(200);
      expect(cookies(res).wts_at).toBeTruthy();
    }
  });

  it('a Vietnamese password matches in either Unicode form', async () => {
    const pw = 'mậtkhẩu-bí-mật';
    await http()
      .post('/api/auth/register')
      .send({
        username: 'viet',
        email: 'viet@example.com',
        password: pw.normalize('NFC'),
      })
      .expect(201);
    await http()
      .post('/api/auth/login')
      .send({ identifier: 'viet', password: pw.normalize('NFD') })
      .expect(200);
  });

  it('wrong password and unknown account look identical', async () => {
    const a = await http()
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: 'wrong-password' })
      .expect(401);
    const b = await http()
      .post('/api/auth/login')
      .send({ identifier: 'nobody', password: 'wrong-password' })
      .expect(401);
    expect(a.body).toEqual(b.body);
    expect(a.body.code).toBe('invalid_credentials');
  });

  it('refuses cross-origin writes', async () => {
    const res = await http()
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ identifier: 'alice', password: alice.password })
      .expect(403);
    expect(res.body.code).toBe('bad_origin');
  });

  it('accepts same-origin writes', async () => {
    await http()
      .post('/api/auth/login')
      .set('Host', 'game.local')
      .set('Origin', 'https://game.local')
      .send({ identifier: 'alice', password: alice.password })
      .expect(200);
  });
});

describe('refresh tokens', () => {
  it('session restores via refresh when the access token is gone', async () => {
    const res = await http()
      .get('/api/auth/session')
      .set('Cookie', `wts_rt=${jar.wts_rt}`)
      .expect(200);
    expect(res.body.user.username).toBe('alice');
    const next = cookies(res);
    expect(next.wts_rt).toBeTruthy();
    expect(next.wts_rt).not.toBe(jar.wts_rt);
    jar = next;
  });

  it('rotates on every use, and replaying an old token revokes the family', async () => {
    const first = jar.wts_rt;
    const r1 = await http()
      .post('/api/auth/refresh')
      .set('Cookie', `wts_rt=${first}`)
      .expect(200);
    const second = cookies(r1).wts_rt;
    expect(second).not.toBe(first);

    // Someone replays the already-used token: treated as theft.
    await http()
      .post('/api/auth/refresh')
      .set('Cookie', `wts_rt=${first}`)
      .expect(401);
    // ...which also kills the legitimate newer token from the same sign-in.
    await http()
      .post('/api/auth/refresh')
      .set('Cookie', `wts_rt=${second}`)
      .expect(401);
  });

  it('a garbage token is just unauthenticated', async () => {
    const res = await http()
      .post('/api/auth/refresh')
      .set('Cookie', 'wts_rt=nope')
      .expect(401);
    expect(res.body.code).toBe('unauthenticated');
  });

  it('logout revokes the refresh token server-side', async () => {
    const login = await http()
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: alice.password })
      .expect(200);
    const c = cookies(login);
    const out = await http()
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader(c))
      .expect(204);
    expect((out.headers['set-cookie'] as unknown as string[]).join()).toMatch(
      /wts_rt=;/,
    );
    await http()
      .post('/api/auth/refresh')
      .set('Cookie', `wts_rt=${c.wts_rt}`)
      .expect(401);
  });

  it('bearer tokens work for non-browser clients', async () => {
    const login = await http()
      .post('/api/auth/login')
      .send({ identifier: 'alice', password: alice.password });
    jar = cookies(login);
    await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${jar.wts_at}`)
      .expect(200);
    await http()
      .get('/api/auth/me')
      .set('Authorization', 'Bearer forged.token.here')
      .expect(401);
  });
});

describe('rounds and stats', () => {
  const round = {
    subjectId: 'noi-nay-co-anh',
    won: true,
    score: 800,
    difficulty: 'impossible',
    facet: 'nhac-tre',
  };

  it('guests cannot record', async () => {
    await http().post('/api/rounds').send(round).expect(401);
    await http().get('/api/stats/me').expect(401);
  });

  it('builds the streak on the server', async () => {
    let stats;
    for (let i = 0; i < 3; i++) {
      const res = await http()
        .post('/api/rounds')
        .set('Cookie', cookieHeader(jar))
        .send(round)
        .expect(201);
      stats = res.body.stats;
    }
    expect(stats).toEqual({
      played: 3,
      won: 3,
      currentStreak: 3,
      bestStreak: 3,
      totalScore: 2400,
    });

    const loss = await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, won: false, score: 0, facet: null })
      .expect(201);
    expect(loss.body.stats).toEqual({
      played: 4,
      won: 3,
      currentStreak: 0,
      bestStreak: 3,
      totalScore: 2400,
    });

    const mine = await http()
      .get('/api/stats/me')
      .set('Cookie', cookieHeader(jar))
      .expect(200);
    expect(mine.body.stats.bestStreak).toBe(3);
    const songs = await http()
      .get('/api/stats/me?topic=songs')
      .set('Cookie', cookieHeader(jar))
      .expect(200);
    expect(songs.body.stats).toEqual(mine.body.stats);

    const [totals] = await db.query(`
      SELECT sum(played)::int AS played, sum(won)::int AS won,
             sum(total_score)::int AS score FROM player_topic_stats
      WHERE user_id = (SELECT id FROM users WHERE username = 'alice')`);
    expect(totals).toMatchObject({
      played: mine.body.stats.played,
      won: mine.body.stats.won,
      score: mine.body.stats.totalScore,
    });

    // Another Topic's totals must not leak into the Songs view.
    await db.query(`
      INSERT INTO player_topic_stats (user_id, topic, played, won, current_streak, best_streak, total_score)
      SELECT id, 'other', 5, 5, 5, 5, 4000 FROM users WHERE username = 'alice'`);
    const stillSongs = await http()
      .get('/api/stats/me?topic=songs')
      .set('Cookie', cookieHeader(jar))
      .expect(200);
    expect(stillSongs.body.stats).toEqual(mine.body.stats);
    await db.query(`DELETE FROM player_topic_stats WHERE topic = 'other'`);

    const [{ n }] = await db.query(`SELECT count(*)::int AS n FROM rounds`);
    expect(n).toBe(4);
  });

  it('concurrent rounds do not lose updates', async () => {
    const before = (
      await http().get('/api/stats/me').set('Cookie', cookieHeader(jar))
    ).body.stats;
    await Promise.all(
      Array.from({ length: 10 }, () =>
        http()
          .post('/api/rounds')
          .set('Cookie', cookieHeader(jar))
          .send(round)
          .expect(201),
      ),
    );
    const after = (
      await http().get('/api/stats/me').set('Cookie', cookieHeader(jar))
    ).body.stats;
    expect(after.played).toBe(before.played + 10);
    expect(after.totalScore).toBe(before.totalScore + 8000);
    expect(after.currentStreak).toBe(before.currentStreak + 10);
  });

  it('refuses impossible rounds', async () => {
    const bad = [
      { ...round, score: 1001 },
      { ...round, score: 12.5 },
      { ...round, won: false }, // a loss cannot score
      { ...round, score: 10 }, // below the least a win can score
      { ...round, difficulty: 'godmode' },
      { ...round, difficulty: 'normal' }, // the pre-tier name
      { ...round, facet: 'DROP TABLE' },
      { ...round, subjectId: '../../etc/passwd' },
    ];
    for (const body of bad) {
      const res = await http()
        .post('/api/rounds')
        .set('Cookie', cookieHeader(jar))
        .send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it('stores scaled wins, clamps old clients, and rejects wins below the Tier floor', async () => {
    const before = (
      await http()
        .get('/api/stats/me')
        .set('Cookie', cookieHeader(jar))
        .expect(200)
    ).body.stats.totalScore;
    const scaled = await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, difficulty: 'easy', score: 20 })
      .expect(201);
    expect(scaled.body.stats.totalScore).toBe(before + 20);
    const old = await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, difficulty: 'easy', score: 1000 })
      .expect(201);
    expect(old.body.stats.totalScore).toBe(before + 420);
    const saved = await db.query(
      `SELECT score FROM rounds WHERE difficulty = 'easy' ORDER BY played_at DESC, id DESC LIMIT 2`,
    );
    expect(
      saved
        .map((row: { score: number }) => row.score)
        .sort((a: number, b: number) => a - b),
    ).toEqual([20, 400]);
    const topic = await http()
      .get('/api/stats/me?topic=songs')
      .set('Cookie', cookieHeader(jar))
      .expect(200);
    expect(topic.body.stats.totalScore).toBe(old.body.stats.totalScore);
    const board = await http().get('/api/leaderboard?period=week').expect(200);
    expect(
      board.body.rows.find(
        (row: { username: string }) => row.username === 'alice',
      ).points,
    ).toBe(old.body.stats.totalScore);
    await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, difficulty: 'easy', score: 19 })
      .expect(400);
    await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, won: false, score: 20 })
      .expect(400);
  });

  it('accepts an omitted Topic as Songs and an explicit Songs Topic', async () => {
    const omitted = await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send(round)
      .expect(201);
    const explicit = await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, topic: 'songs' })
      .expect(201);
    expect(explicit.body.stats.played).toBe(omitted.body.stats.played + 1);
  });

  it('accepts People as a Topic in round reports without a migration', async () => {
    await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, topic: 'people', subjectId: 'hoa-minzy', facet: 'ca-si' })
      .expect(201);
    const rows = await db.query(
      `SELECT topic, subject_id, facet FROM rounds WHERE topic = 'people' AND subject_id = 'hoa-minzy'`,
    );
    expect(rows).toContainEqual(expect.objectContaining({
      topic: 'people', subject_id: 'hoa-minzy', facet: 'ca-si',
    }));
  });

  it('rejects an unknown Topic with a typed error and no recorded round', async () => {
    const before = await db.query(`SELECT count(*)::int AS n FROM rounds`);
    const res = await http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(jar))
      .send({ ...round, topic: 'unknown' })
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, code: 'unknown_topic' });
    const after = await db.query(`SELECT count(*)::int AS n FROM rounds`);
    expect(after[0].n).toBe(before[0].n);
    const stats = await http()
      .get('/api/stats/me?topic=unknown')
      .set('Cookie', cookieHeader(jar))
      .expect(400);
    expect(stats.body.code).toBe('unknown_topic');
    const board = await http().get('/api/leaderboard?topic=unknown').expect(400);
    expect(board.body.code).toBe('unknown_topic');
    const malformed = await http()
      .get('/api/stats/me?topic=Bad%20Topic')
      .set('Cookie', cookieHeader(jar))
      .expect(400);
    expect(malformed.body.code).toBe('validation_failed');
  });
});

describe('leaderboard', () => {
  const HOUR = 60 * 60 * 1000;
  let bob: Record<string, string>;
  let carol: Record<string, string>;

  const register = async (username: string) =>
    cookies(
      await http()
        .post('/api/auth/register')
        .send({
          username,
          email: `${username}@example.com`,
          password: 'hunter2hunter2',
        })
        .expect(201),
    );
  const play = (who: Record<string, string>, score: number) =>
    http()
      .post('/api/rounds')
      .set('Cookie', cookieHeader(who))
      .send({
        subjectId: 'noi-nay-co-anh',
        won: score > 0,
        score,
        difficulty: 'impossible',
        facet: null,
      })
      .expect(201);
  /** Rounds in an earlier period can only be written directly: the API stamps now(). */
  const playedAt = async (username: string, score: number, at: number) => {
    await db.query(
      `INSERT INTO rounds (user_id, subject_id, won, score, difficulty, played_at)
       SELECT id, 'noi-nay-co-anh', $2, $3, 'medium', $4 FROM users WHERE username = $1`,
      [username, score > 0, score, new Date(at)],
    );
  };
  const board = async (query = '') =>
    (await http().get(`/api/leaderboard${query}`).expect(200)).body;
  const names = async (query: string) =>
    (await board(query)).rows.map((r: { username: string }) => r.username);

  beforeAll(async () => {
    // Earlier suites left rounds behind; start the board from nothing.
    await db.query('TRUNCATE rounds, player_stats, player_topic_stats');
    bob = await register('Bob');
    carol = await register('carol');
  });

  it('guests can read it, and it defaults to this week', async () => {
    const res = await board();
    const week = periodRange('week', Date.now(), 7, 0);
    expect(res).toEqual({
      period: 'week',
      back: 0,
      from: new Date(week.from).toISOString(),
      to: new Date(week.to).toISOString(),
      utcOffset: 7,
      rows: [],
    });
  });

  it('totals points per player; equal points share a rank', async () => {
    await play(jar, 800); // alice
    await play(jar, 0);
    await play(bob, 800);
    await play(carol, 300);

    const { rows } = await board('?period=week&back=0');
    expect(rows).toEqual([
      // Tied on points and wins; Bob took fewer rounds, so he is listed first.
      { rank: 1, username: 'Bob', points: 800, rounds: 1, wins: 1 },
      { rank: 1, username: 'alice', points: 800, rounds: 2, wins: 1 },
      { rank: 3, username: 'carol', points: 300, rounds: 1, wins: 1 },
    ]);
  });

  it('filters a Topic board while the global board includes other Topics', async () => {
    await db.query(`
      INSERT INTO rounds (user_id, topic, subject_id, won, score, difficulty)
      SELECT id, 'people', 'someone', true, 900, 'medium'
      FROM users WHERE username = 'carol'`);
    const global = (await board('?period=week')).rows;
    const songs = (await board('?period=week&topic=songs')).rows;
    expect(
      global.find((r: { username: string }) => r.username === 'carol').points,
    ).toBe(1200);
    expect(
      songs.find((r: { username: string }) => r.username === 'carol').points,
    ).toBe(300);
    expect(
      songs.find((r: { username: string }) => r.username === 'alice').points,
    ).toBe(800);
    await db.query(`DELETE FROM rounds WHERE topic = 'people'`);
  });

  it('keeps each period to its own rounds', async () => {
    const now = Date.now();
    const lastWeek = periodRange('week', now, 7, 1).from + HOUR;
    const lastMonth = periodRange('month', now, 7, 1).from + HOUR;
    await playedAt('carol', 1000, lastWeek);
    await playedAt('Bob', 500, lastMonth);

    expect(await names('?period=week&back=1')).toEqual(['carol']);

    // Last week can fall in this month or the previous one, depending on today.
    const thisMonth = periodRange('month', now, 7, 0);
    const lastWeekIsThisMonth = lastWeek >= thisMonth.from;
    const month0 = (await board('?period=month')).rows;
    const month1 = (await board('?period=month&back=1')).rows;
    const carolNow = month0.find(
      (r: { username: string }) => r.username === 'carol',
    );
    expect(carolNow.points).toBe(lastWeekIsThisMonth ? 1300 : 300);
    const bobBefore = month1.find(
      (r: { username: string }) => r.username === 'Bob',
    );
    expect(bobBefore.points).toBe(500);
    expect(
      month1.some((r: { username: string }) => r.username === 'carol'),
    ).toBe(!lastWeekIsThisMonth);
  });

  it('a round at the very start of the week counts; the instant before does not', async () => {
    const week = periodRange('week', Date.now(), 7, 0);
    await db.query('TRUNCATE rounds, player_stats, player_topic_stats');
    await playedAt('carol', 100, week.from);
    await playedAt('Bob', 100, week.from - 1);
    expect(await names('?period=week')).toEqual(['carol']);
    expect(await names('?period=week&back=1')).toEqual(['Bob']);
  });

  it('refuses anything but week or month, this one or the last', async () => {
    for (const q of [
      '?period=year',
      '?period=week&back=2',
      '?back=abc',
      '?back=-1',
      '?extra=1',
    ]) {
      const res = await http().get(`/api/leaderboard${q}`).expect(400);
      expect(res.body.code, q).toBe('validation_failed');
    }
  });
});

describe('limits', () => {
  it('oversized bodies are refused', async () => {
    await http()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ identifier: 'a', password: 'x'.repeat(20_000) }))
      .expect(413);
  });

  it('malformed JSON is a 400, not a 500', async () => {
    const res = await http()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{nope')
      .expect(400);
    expect(res.body.code).toBe('bad_request');
  });

  it('unknown routes 404 with a code', async () => {
    const res = await http().get('/api/nope').expect(404);
    expect(res.body.code).toBe('not_found');
  });
});
