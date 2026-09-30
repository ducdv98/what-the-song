import { BadRequestException, Injectable } from '@nestjs/common';
import type { PlayerStats as StatsView } from '@wts/contracts';
import { WORST_SCORE } from '@wts/game';
import { DataSource } from 'typeorm';
import type { RecordRoundDto } from './dto/record-round.dto.js';
import { PlayerStats } from './player-stats.entity.js';
import { Round } from './round.entity.js';

const EMPTY: StatsView = {
  played: 0,
  won: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalScore: 0,
};

function view(row: PlayerStats | undefined | null): StatsView {
  if (!row) return EMPTY;
  return {
    played: row.played,
    won: row.won,
    currentStreak: row.currentStreak,
    bestStreak: row.bestStreak,
    totalScore: Number(row.totalScore),
  };
}

@Injectable()
export class StatsService {
  constructor(private readonly dataSource: DataSource) {}

  async get(userId: string): Promise<StatsView> {
    return view(
      await this.dataSource.getRepository(PlayerStats).findOneBy({ userId }),
    );
  }

  /**
   * Store a round and fold it into the running totals.
   *
   * Rounds are played in the browser, so the server cannot prove a result is
   * honest — among friends that is accepted (docs/RESEARCH.md §10.5). What it
   * does refuse is the impossible: a scoring loss, a pointless win, a score off
   * the scale.
   *
   * The totals update is one atomic upsert computed in SQL, not a
   * read-modify-write, so two rounds finishing at once — on one instance or on
   * two — cannot lose an update.
   */
  async record(userId: string, dto: RecordRoundDto): Promise<StatsView> {
    if (!dto.won && dto.score !== 0)
      throw new BadRequestException({ code: 'invalid_round' });
    if (dto.won && dto.score < WORST_SCORE)
      throw new BadRequestException({ code: 'invalid_round' });

    return this.dataSource.transaction(async (em) => {
      await em.insert(Round, {
        userId,
        songId: dto.songId,
        won: dto.won,
        score: dto.score,
        difficulty: dto.difficulty,
        genre: dto.genre ?? null,
      });
      const won = dto.won ? 1 : 0;
      const rows: PlayerStats[] = await em.query(
        `INSERT INTO player_stats AS s (user_id, played, won, current_streak, best_streak, total_score)
         VALUES ($1, 1, $2, $2, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET
           played         = s.played + 1,
           won            = s.won + $2,
           current_streak = CASE WHEN $2 = 1 THEN s.current_streak + 1 ELSE 0 END,
           best_streak    = GREATEST(s.best_streak, CASE WHEN $2 = 1 THEN s.current_streak + 1 ELSE 0 END),
           total_score    = s.total_score + $3,
           updated_at     = now()
         RETURNING played, won, current_streak AS "currentStreak", best_streak AS "bestStreak",
                   total_score AS "totalScore"`,
        [userId, won, dto.score],
      );
      return view(rows[0]);
    });
  }
}
