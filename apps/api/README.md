# @wts/api

Accounts and player records for the game, as a NestJS service. The game
(`apps/web`) is still a static export; this is the only server-side code, and
it lives under `/api` on the same origin (Caddy in production, the Next dev
server's proxy in development).

It depends on two workspace packages:

- **`@wts/contracts`** — the request/response shapes and input rules this API
  implements. The DTOs `implements` its request types, and the controllers
  return its response types, so the web client and this service are checked
  against one definition.
- **`@wts/game`** — the game's own rules. Round reports are validated against
  the real `TIER_SLUGS`, `BEST_SCORE` and `WORST_SCORE` the browser played
  with, not a copy.

## What it does

- **Guests** play without touching this service at all. Their stats live in the
  browser tab (`sessionStorage`) and are gone when the tab closes.
- **Players** register with a username, email and password, sign in with
  either username or email, and every round they finish is stored. Streaks and
  totals are computed on the server, and the `rounds` table feeds the weekly
  and monthly leaderboard.

## Endpoints

All under `/api`. Errors are `{ statusCode, code, message?, fields? }`, where
`code` is stable and the web client turns it into translated copy.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `{ username, email, password }` → 201 `{ user }`, sets cookies |
| POST | `/auth/login` | — | `{ identifier, password }` — username or email → `{ user }` |
| POST | `/auth/refresh` | refresh cookie | rotates the refresh token, new access token |
| POST | `/auth/logout` | refresh cookie | revokes the session server-side → 204 |
| GET | `/auth/session` | optional | page-load restore: user, silently refreshed, or `null` — never 401 |
| GET | `/auth/me` | access | the signed-in user |
| GET | `/stats/me` | access | `{ played, won, currentStreak, bestStreak, totalScore }` |
| POST | `/rounds` | access | `{ songId, won, score, difficulty, genre }` → updated stats. `difficulty` is the song's tier (`easy` … `impossible`). |
| GET | `/leaderboard` | — | `?period=week\|month&back=0\|1` (defaults: this week) → `{ period, back, from, to, utcOffset, rows: [{ rank, username, points, rounds, wins }] }`, top 100 |
| GET | `/health` | — | database ping, for container healthchecks |

Error codes: `validation_failed` (+ `fields`), `username_taken`, `email_taken`,
`invalid_credentials`, `unauthenticated`, `rate_limited`, `bad_origin`,
`invalid_round`, `server_error`.

## Design

**Tokens.** A short-lived JWT access token (15 min, HS256) and an opaque
refresh token (30 days), both in `HttpOnly; SameSite=Lax` cookies. The access
cookie is scoped to `/api`, the refresh cookie only to `/api/auth`, so the
long-lived one is not sent with every gameplay request. Verifying an access
token needs no database read, so it costs the same on one instance or twenty.
Non-browser clients can send `Authorization: Bearer <access token>` instead.

**Refresh rotation with reuse detection.** Every refresh revokes the token it
was given and issues a new one in the same *family*. Presenting a token that was
already rotated means it was copied, so the whole family is revoked and both
parties must sign in again. Two concurrent refreshes with the same token are
resolved by a conditional update, so exactly one wins. Only SHA-256 hashes of
refresh tokens are stored.

**Passwords.** argon2id with the library defaults (64 MiB, t=3, p=4), NFC
normalised first so a Vietnamese password typed in decomposed form still
matches. Unknown accounts are verified against a dummy hash, so response time
does not reveal which usernames exist, and "wrong password" and "no such
account" return the same error.

**Uniqueness.** Usernames and emails are unique case-insensitively (unique
indexes on `lower(...)`). Usernames are ASCII `[A-Za-z0-9_]{3,20}` — see the
comment in `src/auth/dto/register.dto.ts` for why.

**Cross-site requests.** SameSite=Lax keeps cookies off cross-site POSTs, and a
same-origin middleware rejects any write whose `Origin` does not match the host.
There is no CORS configuration because nothing legitimate is cross-origin.

**Rounds.** The game is played in the browser, so the server cannot prove a
result is honest (among friends that is accepted — `docs/RESEARCH.md` §10.5). It
does refuse the impossible: scores off the 0–1000 scale, a scoring loss, a win
below the 50-point floor, unknown tiers. Totals are updated with one
atomic `INSERT … ON CONFLICT DO UPDATE` computed in SQL, so concurrent rounds
cannot lose updates, whichever instance handles them.

**Limits.** Global throttle of 120 requests/min per client; sign-in and
register at `AUTH_RATE_LIMIT` (default 10/min). JSON bodies capped at 10 kB;
unknown properties are rejected, not silently dropped. `helmet` sets the usual
headers.

## Scaling notes

The service is stateless — everything durable is in Postgres — so it scales
horizontally: `docker compose up -d --scale api=3` and Caddy balances across
the replicas (`dynamic a` upstreams). Two things to change when you do this for
real:

- **Rate limits are per instance** (in-memory throttler storage). Behind N
  replicas the effective limit is N times higher. Swap in a shared store such as
  Redis (`@nest-lab/throttler-storage-redis`) before relying on them.
- **Migrations run on boot** (`DB_MIGRATIONS_RUN=true`). TypeORM takes a
  Postgres advisory lock, so replicas starting together do not race, but for
  zero-downtime deploys it is cleaner to set it `false` and run
  `npm run migration:run` as a release step.

## Schema

`src/database/migrations/` — written by hand so the functional unique indexes
and leaderboard indexes are exactly as intended. `synchronize` is off; schema
changes only happen through migrations. When you add one, list it in
`src/database/typeorm.options.ts`.

| Table | Holds |
|---|---|
| `users` | id (uuid), username, email (lowercased), argon2id hash |
| `refresh_tokens` | hashed token, family, expiry, revoked-at, user agent |
| `rounds` | every finished round: song, won, score, difficulty, genre, time |
| `player_stats` | running totals per player, indexed for all-time leaderboards |

## Running it

Needs Node 22+ and Postgres 14+. Install from the **repo root** — this is an
npm workspace, and `@wts/game` / `@wts/contracts` must be built before it runs,
which turbo handles.

```sh
# from the repo root
npm install
cp apps/api/.env.example apps/api/.env      # set DATABASE_URL and JWT_ACCESS_SECRET
npx turbo run dev --filter=@wts/api...      # packages, then http://localhost:4000/api
```

`npm run dev` at the root starts this and the web app together. Migrations run
on boot.

```sh
# from the repo root
npx turbo run test --filter=@wts/api        # unit tests, no database
npm run test:e2e                            # full app against a real Postgres (drops its schema!)
npx turbo run lint --filter=@wts/api

# from apps/api, after a build
npm run migration:show
```

`test:e2e` uses `TEST_DATABASE_URL`, defaulting to
`postgres://wts:wts@127.0.0.1:5432/wts_test`. Its schema is dropped at the start
of every run, so never point it at a database you care about.

## Configuration

Validated at boot (`src/config/env.validation.ts`); a missing or malformed value
stops the process with a message naming it.

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | — | required |
| `JWT_ACCESS_SECRET` | — | required, ≥ 32 chars: `openssl rand -base64 48` |
| `PORT` | 4000 | |
| `JWT_ACCESS_TTL` | 900 | seconds |
| `REFRESH_TTL_DAYS` | 30 | |
| `TRUST_PROXY` | false | true behind Caddy or the Next dev proxy |
| `COOKIE_SECURE` | false | force `Secure`; otherwise it follows the request scheme |
| `DB_MIGRATIONS_RUN` | true | |
| `AUTH_RATE_LIMIT` | 10 | sign-in/register attempts per minute per client |
| `LEADERBOARD_UTC_OFFSET` | 7 | hours from UTC at which leaderboard weeks (Monday) and months (the 1st) start |
