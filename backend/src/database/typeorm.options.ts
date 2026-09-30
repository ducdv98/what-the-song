import type { DataSourceOptions } from 'typeorm';
import { RefreshToken } from '../auth/refresh-token.entity.js';
import { PlayerStats } from '../stats/player-stats.entity.js';
import { Round } from '../stats/round.entity.js';
import { User } from '../users/user.entity.js';
import { InitAccounts1790000000000 } from './migrations/1790000000000-InitAccounts.js';

/**
 * Shared by the Nest app and the TypeORM CLI (data-source.ts), so the two can
 * never disagree about entities or migrations.
 *
 * Entities and migrations are listed explicitly rather than globbed: globs
 * resolve differently under ts sources, compiled dist and the test runner.
 * Add each new migration here.
 */
export function typeormOptions(
  url: string,
  migrationsRun: boolean,
): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [User, RefreshToken, Round, PlayerStats],
    migrations: [InitAccounts1790000000000],
    migrationsRun,
    // Schema changes go through migrations only — never let the ORM guess.
    synchronize: false,
    // Each migration in its own transaction; Postgres takes an advisory lock,
    // so several instances booting at once do not race to migrate.
    migrationsTransactionMode: 'each',
  };
}
